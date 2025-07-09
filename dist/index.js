import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadDeviceConfig } from './config-loader.js';
import { CiscoConnectionManager } from './cisco-connection.js';
// 加载设备配置
const configFilePath = process.argv[2];
const deviceConfigMap = await loadDeviceConfig(configFilePath);
console.error(`Cisco MCP: loaded ${deviceConfigMap.size} devices`);
const connectionManager = new CiscoConnectionManager();
const server = new Server({ name: 'cisco-mcp', version: '2.0.0' });
// 返回工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_available_devices',
                description: 'List all devices defined in the configuration file passed when starting the server.\nCall this first if you are unsure which deviceAlias to use.',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'connect_cisco_device',
                description: 'Establish a persistent connection to a Cisco device.\nNormally you do NOT need to call this manually: execute_cisco_command will auto-connect if necessary.\nStill useful when you want to keep the session warm.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deviceAlias: { type: 'string', description: 'Alias of device to connect.' },
                    },
                    required: ['deviceAlias'],
                },
            },
            {
                name: 'execute_cisco_command',
                description: 'Execute any Cisco IOS command.\nIf the device is not yet connected, the server will automatically connect using the saved credentials.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deviceAlias: { type: 'string', description: 'Alias of target device' },
                        command: {
                            type: 'string',
                            description: 'Cisco command to execute, e.g., "show version"',
                        },
                        mode: {
                            type: 'string',
                            enum: ['user', 'enable', 'config'],
                            description: 'Execution mode',
                            default: 'user',
                        },
                    },
                    required: ['deviceAlias', 'command'],
                },
            },
            {
                name: 'disconnect_cisco_device',
                description: 'Close the persistent connection for the given deviceAlias and free resources.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deviceAlias: { type: 'string', description: 'Alias to disconnect' },
                    },
                    required: ['deviceAlias'],
                },
            },
            {
                name: 'list_connections',
                description: 'List current active connections',
                inputSchema: { type: 'object', properties: {} },
            },
        ],
    };
});
// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
        switch (name) {
            case 'list_available_devices': {
                const list = Array.from(deviceConfigMap.values()).map((d) => ({
                    alias: d.alias,
                    host: d.host,
                    protocol: d.protocol ?? 'ssh',
                }));
                return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
            }
            case 'connect_cisco_device': {
                const { deviceAlias } = args;
                const dev = deviceConfigMap.get(deviceAlias);
                if (!dev)
                    throw new Error(`Unknown deviceAlias ${deviceAlias}`);
                const res = await connectionManager.connect(dev);
                return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
            }
            case 'execute_cisco_command': {
                const { deviceAlias, command, mode = 'user' } = args;
                let output;
                try {
                    output = await connectionManager.executeCommand(deviceAlias, command, mode);
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (msg.startsWith('No active connection')) {
                        const dev = deviceConfigMap.get(deviceAlias);
                        if (!dev)
                            throw new Error(`${msg} and deviceAlias not found in config`);
                        const connRes = await connectionManager.connect(dev);
                        if (!connRes.success)
                            throw new Error(`Auto-connect failed: ${connRes.message}`);
                        output = await connectionManager.executeCommand(deviceAlias, command, mode);
                    }
                    else {
                        throw err;
                    }
                }
                return { content: [{ type: 'text', text: output }] };
            }
            case 'disconnect_cisco_device': {
                const { deviceAlias } = args;
                const res = await connectionManager.disconnect(deviceAlias);
                return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
            }
            case 'list_connections': {
                const list = connectionManager.listConnections();
                return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
            }
            default:
                throw new Error(`Unknown tool ${name}`);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
});
// 启动 MCP Server
(async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Cisco MCP Server (v2) listening on stdio');
})();
//# sourceMappingURL=index.js.map