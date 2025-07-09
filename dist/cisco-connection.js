import { Client as SSHClient } from 'ssh2';
import { Telnet } from 'telnet-client';
export class CiscoConnectionManager {
    constructor() {
        this.connections = new Map();
    }
    /**
     * 建立到指定设备的连接，键值使用 alias。
     */
    async connect(device) {
        const { alias, protocol = 'ssh' } = device;
        // 若已有连接且未断开，直接返回成功
        const existing = this.connections.get(alias);
        if (existing && existing.connected) {
            return { success: true, message: `Already connected to ${alias}`, alias };
        }
        return protocol === 'ssh' ? this.connectSSH(device) : this.connectTelnet(device);
    }
    connectSSH(device) {
        const { alias, host, username, password, port = 22 } = device;
        return new Promise((resolve) => {
            const client = new SSHClient();
            client.on('ready', () => {
                client.shell((err, stream) => {
                    if (err) {
                        resolve({ success: false, message: `Shell error: ${err.message}`, alias });
                        return;
                    }
                    const conn = {
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
                    this.executeSSHCommand(conn, 'terminal length 0').catch(() => { });
                    stream.on('close', () => this.connections.delete(alias));
                    resolve({ success: true, message: `SSH connected to ${alias}`, alias });
                });
            });
            client.on('error', (err) => {
                resolve({ success: false, message: `SSH error: ${err.message}`, alias });
            });
            client.connect({ host, port, username, password, readyTimeout: 30000 });
        });
    }
    async connectTelnet(device) {
        const { alias, host, username, password, port = 23 } = device;
        try {
            const client = new Telnet();
            await client.connect({
                host,
                port,
                shellPrompt: /[>#]\s*$/,
                timeout: 30000,
                loginPrompt: /(login|username)[: ]*$/i,
                passwordPrompt: /password[: ]*$/i,
                username,
                password,
            });
            const conn = {
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
            try {
                await client.exec('terminal length 0', { timeout: 30000 });
            }
            catch { }
            return { success: true, message: `Telnet connected to ${alias}`, alias };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, message: `Telnet error: ${msg}`, alias };
        }
    }
    async executeCommand(alias, command, mode = 'user') {
        const connection = this.connections.get(alias);
        if (!connection || !connection.connected) {
            throw new Error(`No active connection for alias ${alias}`);
        }
        connection.lastActivity = new Date();
        await this.switchMode(connection, mode);
        return connection.protocol === 'ssh'
            ? this.executeSSHCommand(connection, command)
            : this.executeTelnetCommand(connection, command);
    }
    async switchMode(connection, target) {
        if (connection.currentMode === target)
            return;
        const enablePass = connection.config.enablePassword;
        const send = (cmd) => connection.protocol === 'ssh'
            ? this.executeSSHCommand(connection, cmd)
            : this.executeTelnetCommand(connection, cmd);
        if (target === 'enable' && connection.currentMode === 'user') {
            if (!enablePass)
                throw new Error('Enable password required');
            await send('enable');
            await send(enablePass);
            connection.currentMode = 'enable';
        }
        else if (target === 'config') {
            if (connection.currentMode === 'user') {
                await this.switchMode(connection, 'enable');
            }
            await send('configure terminal');
            connection.currentMode = 'config';
        }
        else if (target === 'user') {
            if (connection.currentMode === 'config')
                await send('exit');
            await send('exit');
            connection.currentMode = 'user';
        }
    }
    executeSSHCommand(conn, cmd) {
        return new Promise((resolve) => {
            let out = '';
            const stream = conn.shell;
            const cleanup = () => stream.removeAllListeners('data');
            let timer = setTimeout(() => {
                cleanup();
                resolve(out || 'timeout');
            }, 30000);
            stream.on('data', (data) => {
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
    async executeTelnetCommand(conn, cmd) {
        try {
            return await conn.client.exec(cmd, { timeout: 60000 });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return `Telnet exec error: ${msg}`;
        }
    }
    async disconnect(alias) {
        const conn = this.connections.get(alias);
        if (!conn)
            return { success: false, message: `No connection for ${alias}`, alias };
        try {
            if (conn.protocol === 'ssh') {
                conn.client.end();
            }
            else {
                await conn.client.end();
            }
            this.connections.delete(alias);
            return { success: true, message: `Disconnected ${alias}`, alias };
        }
        catch (err) {
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
//# sourceMappingURL=cisco-connection.js.map