import { Client as SSHClient } from 'ssh2';
import { Telnet } from 'telnet-client';
export class CiscoConnectionManager {
    constructor() {
        this.connections = new Map();
    }
    async connect(config) {
        const { host, username, password, protocol, port, enablePassword } = config;
        try {
            // Check if already connected
            if (this.connections.has(host)) {
                const existing = this.connections.get(host);
                if (existing.connected) {
                    return {
                        success: true,
                        message: `Already connected to ${host} via ${protocol.toUpperCase()}`,
                        host,
                    };
                }
            }
            if (protocol === 'ssh') {
                return await this.connectSSH(config);
            }
            else {
                return await this.connectTelnet(config);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Failed to connect to ${host}: ${errorMessage}`,
                host,
            };
        }
    }
    async connectSSH(config) {
        const { host, username, password, port = 22 } = config;
        return new Promise((resolve) => {
            const client = new SSHClient();
            client.on('ready', () => {
                client.shell((err, stream) => {
                    if (err) {
                        resolve({
                            success: false,
                            message: `Failed to open shell: ${err.message}`,
                            host,
                        });
                        return;
                    }
                    const connection = {
                        config,
                        client,
                        shell: stream,
                        connected: true,
                        connectedAt: new Date(),
                        lastActivity: new Date(),
                        currentMode: 'user',
                    };
                    this.connections.set(host, connection);
                    // Set up stream handlers
                    stream.on('close', () => {
                        this.connections.delete(host);
                    });
                    resolve({
                        success: true,
                        message: `Successfully connected to ${host} via SSH`,
                        host,
                    });
                });
            });
            client.on('error', (err) => {
                resolve({
                    success: false,
                    message: `SSH connection error: ${err.message}`,
                    host,
                });
            });
            client.connect({
                host,
                port,
                username,
                password,
                readyTimeout: 30000,
            });
        });
    }
    async connectTelnet(config) {
        const { host, username, password, port = 23 } = config;
        try {
            const client = new Telnet();
            await client.connect({
                host,
                port,
                shellPrompt: /[$%#>]\s*$/,
                timeout: 30000,
                loginPrompt: /login[: ]*$/i,
                passwordPrompt: /password[: ]*$/i,
                username,
                password,
            });
            const connection = {
                config,
                client,
                connected: true,
                connectedAt: new Date(),
                lastActivity: new Date(),
                currentMode: 'user',
            };
            this.connections.set(host, connection);
            return {
                success: true,
                message: `Successfully connected to ${host} via Telnet`,
                host,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Telnet connection error: ${errorMessage}`,
                host,
            };
        }
    }
    async executeCommand(host, command, mode = 'user') {
        const connection = this.connections.get(host);
        if (!connection || !connection.connected) {
            throw new Error(`No active connection to ${host}. Please connect first.`);
        }
        connection.lastActivity = new Date();
        try {
            // Handle mode switching
            await this.switchMode(connection, mode);
            if (connection.config.protocol === 'ssh') {
                return await this.executeSSHCommand(connection, command);
            }
            else {
                return await this.executeTelnetCommand(connection, command);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Command execution failed: ${errorMessage}`);
        }
    }
    async switchMode(connection, targetMode) {
        if (connection.currentMode === targetMode) {
            return;
        }
        const { enablePassword } = connection.config;
        if (targetMode === 'enable' && connection.currentMode === 'user') {
            if (!enablePassword) {
                throw new Error('Enable password required for privileged mode');
            }
            if (connection.config.protocol === 'ssh') {
                await this.executeSSHCommand(connection, 'enable');
                await this.executeSSHCommand(connection, enablePassword);
            }
            else {
                await this.executeTelnetCommand(connection, 'enable');
                await this.executeTelnetCommand(connection, enablePassword);
            }
            connection.currentMode = 'enable';
        }
        else if (targetMode === 'config' && connection.currentMode !== 'config') {
            // First ensure we're in enable mode
            if (connection.currentMode === 'user') {
                await this.switchMode(connection, 'enable');
            }
            if (connection.config.protocol === 'ssh') {
                await this.executeSSHCommand(connection, 'configure terminal');
            }
            else {
                await this.executeTelnetCommand(connection, 'configure terminal');
            }
            connection.currentMode = 'config';
        }
        else if (targetMode === 'user' && connection.currentMode !== 'user') {
            // Exit to user mode
            if (connection.config.protocol === 'ssh') {
                if (connection.currentMode === 'config') {
                    await this.executeSSHCommand(connection, 'exit');
                }
                await this.executeSSHCommand(connection, 'exit');
            }
            else {
                if (connection.currentMode === 'config') {
                    await this.executeTelnetCommand(connection, 'exit');
                }
                await this.executeTelnetCommand(connection, 'exit');
            }
            connection.currentMode = 'user';
        }
    }
    async executeSSHCommand(connection, command) {
        return new Promise((resolve, reject) => {
            const stream = connection.shell;
            let output = '';
            let timeoutId;
            const cleanup = () => {
                if (timeoutId)
                    clearTimeout(timeoutId);
                stream.removeAllListeners('data');
            };
            stream.on('data', (data) => {
                const chunk = data.toString();
                output += chunk;
                // Check for common Cisco prompts to determine command completion
                if (chunk.match(/[>#$%]\s*$/) || chunk.includes('--More--')) {
                    cleanup();
                    resolve(output);
                }
            });
            // Set timeout for command execution
            timeoutId = setTimeout(() => {
                cleanup();
                resolve(output || 'Command timeout - no response received');
            }, 30000);
            // Send command
            stream.write(command + '\n');
        });
    }
    async executeTelnetCommand(connection, command) {
        try {
            const client = connection.client;
            const result = await client.exec(command, {
                timeout: 30000,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return `Command execution error: ${errorMessage}`;
        }
    }
    async disconnect(host) {
        const connection = this.connections.get(host);
        if (!connection) {
            return {
                success: false,
                message: `No connection found for ${host}`,
                host,
            };
        }
        try {
            if (connection.config.protocol === 'ssh') {
                const client = connection.client;
                client.end();
            }
            else {
                const client = connection.client;
                await client.end();
            }
            this.connections.delete(host);
            return {
                success: true,
                message: `Successfully disconnected from ${host}`,
                host,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Error disconnecting from ${host}: ${errorMessage}`,
                host,
            };
        }
    }
    listConnections() {
        return Array.from(this.connections.entries()).map(([host, connection]) => ({
            host,
            protocol: connection.config.protocol,
            connected: connection.connected,
            connectedAt: connection.connectedAt,
            lastActivity: connection.lastActivity,
        }));
    }
    // Cleanup method to close all connections
    async cleanup() {
        const hosts = Array.from(this.connections.keys());
        await Promise.all(hosts.map(host => this.disconnect(host)));
    }
}
//# sourceMappingURL=cisco-connection.js.map