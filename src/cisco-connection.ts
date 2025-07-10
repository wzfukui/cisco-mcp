import { Client as SSHClient } from 'ssh2';
import { Telnet } from 'telnet-client';
import type { DeviceConfig } from './config-loader.js';
import type { ClientChannel } from 'ssh2';

export type ConnectionMode = 'user' | 'enable' | 'config';

interface SSHConnection {
  config: DeviceConfig;
  client: SSHClient;
  shell: import('ssh2').ClientChannel;
  protocol: 'ssh';
  connected: boolean;
  connectedAt: Date;
  lastActivity: Date;
  currentMode: ConnectionMode;
}

interface TelnetConnection {
  config: DeviceConfig;
  client: Telnet;
  protocol: 'telnet';
  connected: boolean;
  connectedAt: Date;
  lastActivity: Date;
  currentMode: ConnectionMode;
}

type Connection = SSHConnection | TelnetConnection;

export class CiscoConnectionManager {
  private connections = new Map<string, Connection>();

  /**
   * 建立到指定设备的连接，键值使用 alias。
   */
  async connect(device: DeviceConfig) {
    const { alias, protocol = 'ssh' } = device;
    // 若已有连接且未断开，直接返回成功
    const existing = this.connections.get(alias);
    if (existing && existing.connected) {
      return { success: true, message: `Already connected to ${alias}`, alias };
    }

    return protocol === 'ssh' ? this.connectSSH(device) : this.connectTelnet(device);
  }

  private connectSSH(device: DeviceConfig) {
    const { alias, host, username, password, port = 22 } = device;
    return new Promise<{ success: boolean; message: string; alias: string }>((resolve) => {
      const client = new SSHClient();
      client.on('ready', () => {
        client.shell((err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            resolve({ success: false, message: `Shell error: ${err.message}`, alias });
            return;
          }
          const conn: SSHConnection = {
            config: device,
            client,
            shell: stream,
            protocol: 'ssh',
            connected: true,
            connectedAt: new Date(),
            lastActivity: new Date(),
            currentMode: 'user',
          };
          this.connections.set(alias, conn);
          // 关闭分页，避免 --More-- 停顿
          this.executeSSHCommand(conn, 'terminal length 0').catch(() => {});
          stream.on('close', () => this.connections.delete(alias));
          resolve({ success: true, message: `SSH connected to ${alias}`, alias });
        });
      });
      client.on('error', (err: Error) => {
        resolve({ success: false, message: `SSH error: ${err.message}`, alias });
      });
      client.connect({ host, port, username, password, readyTimeout: 30_000 });
    });
  }

  private async connectTelnet(device: DeviceConfig) {
    const { alias, host, username, password, port = 23 } = device;
    try {
      const client = new Telnet();
      await client.connect({
        host,
        port,
        shellPrompt: /[>#]\s*$/,
        timeout: 30_000,
        loginPrompt: /(login|username)[: ]*$/i,
        passwordPrompt: /password[: ]*$/i,
        username,
        password,
      });
      const conn: TelnetConnection = {
        config: device,
        client,
        protocol: 'telnet',
        connected: true,
        connectedAt: new Date(),
        lastActivity: new Date(),
        currentMode: 'user',
      };
      this.connections.set(alias, conn);
      // 关闭分页
      try { await client.exec('terminal length 0', { timeout: 30_000 }); } catch {}
      return { success: true, message: `Telnet connected to ${alias}`, alias };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Telnet error: ${msg}`, alias };
    }
  }

  async executeCommand(alias: string, command: string, mode: ConnectionMode = 'user') {
    const connection = this.connections.get(alias);
    if (!connection || !connection.connected) {
      throw new Error(`No active connection for alias ${alias}`);
    }
    connection.lastActivity = new Date();
    await this.switchMode(connection, mode);
    return connection.protocol === 'ssh'
      ? this.executeSSHCommand(connection as SSHConnection, command)
      : this.executeTelnetCommand(connection as TelnetConnection, command);
  }

  private async switchMode(connection: Connection, target: ConnectionMode) {
    if (connection.currentMode === target) return;

    const enablePass = connection.config.enablePassword;
    const send = (cmd: string) =>
      connection.protocol === 'ssh'
        ? this.executeSSHCommand(connection as SSHConnection, cmd)
        : this.executeTelnetCommand(connection as TelnetConnection, cmd);

    if (target === 'enable' && connection.currentMode === 'user') {
      // 当设备未设置 enable password 时，直接敲回车即可进入特权模式。
      await send('enable');
      if (enablePass !== undefined) {
        // 若配置了 enablePassword（即使为空字符串，也发送一次回车）
        await send(enablePass);
      }
      connection.currentMode = 'enable';
    } else if (target === 'config') {
      if (connection.currentMode === 'user') {
        await this.switchMode(connection, 'enable');
      }
      await send('configure terminal');
      connection.currentMode = 'config';
    } else if (target === 'user') {
      if (connection.currentMode === 'config') await send('exit');
      await send('exit');
      connection.currentMode = 'user';
    }
  }

  private executeSSHCommand(conn: SSHConnection, cmd: string): Promise<string> {
    return new Promise<string>((resolve) => {
      let out = '';
      const stream = conn.shell;
      const cleanup = () => stream.removeAllListeners('data');
      let timer: NodeJS.Timeout = setTimeout(() => {
        cleanup();
        resolve(out || 'timeout');
      }, 30_000);
      stream.on('data', (data: Buffer) => {
        const chunk = data.toString();
        out += chunk;
        if (chunk.match(/[>#]\s*$/) || chunk.includes('--More--')) {
          clearTimeout(timer);
          cleanup();
          resolve(out);
        }
      });
      stream.write(cmd + '\n');
    });
  }

  private async executeTelnetCommand(conn: TelnetConnection, cmd: string) {
    try {
      return await conn.client.exec(cmd, { timeout: 60_000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Telnet exec error: ${msg}`;
    }
  }

  async disconnect(alias: string) {
    const conn = this.connections.get(alias);
    if (!conn) return { success: false, message: `No connection for ${alias}`, alias };
    try {
      if (conn.protocol === 'ssh') {
        (conn as SSHConnection).client.end();
      } else {
        await (conn as TelnetConnection).client.end();
      }
      this.connections.delete(alias);
      return { success: true, message: `Disconnected ${alias}`, alias };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg, alias };
    }
  }

  listConnections() {
    return Array.from(this.connections.entries()).map(([alias, c]) => ({
      alias,
      host: c.config.host,
      protocol: c.protocol,
      connectedAt: c.connectedAt,
      lastActivity: c.lastActivity,
    }));
  }

  async cleanup() {
    await Promise.all(Array.from(this.connections.keys()).map(a => this.disconnect(a)));
  }
} 