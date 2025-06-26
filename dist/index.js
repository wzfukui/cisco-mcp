#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { CiscoConnectionManager } from './cisco-connection.js';
const server = new Server({
    name: 'cisco-mcp',
    version: '1.0.0',
});
// Connection manager instance
const connectionManager = new CiscoConnectionManager();
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'connect_cisco_device',
                description: 'Connect to a Cisco device via SSH or Telnet. Establishes a persistent connection for command execution.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        host: {
                            type: 'string',
                            description: 'IP address or hostname of the Cisco device',
                        },
                        username: {
                            type: 'string',
                            description: 'Username for authentication',
                        },
                        password: {
                            type: 'string',
                            description: 'Password for authentication',
                        },
                        protocol: {
                            type: 'string',
                            enum: ['ssh', 'telnet'],
                            description: 'Connection protocol (ssh or telnet)',
                            default: 'ssh',
                        },
                        port: {
                            type: 'number',
                            description: 'Port number (default: 22 for SSH, 23 for Telnet)',
                        },
                        enable_password: {
                            type: 'string',
                            description: 'Enable password for privileged mode (optional)',
                        },
                    },
                    required: ['host', 'username', 'password'],
                },
            },
            {
                name: 'execute_cisco_command',
                description: 'Execute a command on a connected Cisco device. The device must be connected first using connect_cisco_device.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        host: {
                            type: 'string',
                            description: 'IP address or hostname of the connected Cisco device',
                        },
                        command: {
                            type: 'string',
                            description: 'Cisco command to execute (e.g., "show version", "show ip interface brief")',
                        },
                        mode: {
                            type: 'string',
                            enum: ['user', 'enable', 'config'],
                            description: 'Execution mode: user (default), enable (privileged), or config (configuration)',
                            default: 'user',
                        },
                    },
                    required: ['host', 'command'],
                },
            },
            {
                name: 'disconnect_cisco_device',
                description: 'Disconnect from a Cisco device and clean up the connection.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        host: {
                            type: 'string',
                            description: 'IP address or hostname of the Cisco device to disconnect',
                        },
                    },
                    required: ['host'],
                },
            },
            {
                name: 'list_connections',
                description: 'List all active Cisco device connections.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'connect_cisco_device': {
                const { host, username, password, protocol = 'ssh', port, enable_password } = args;
                const result = await connectionManager.connect({
                    host,
                    username,
                    password,
                    protocol,
                    port,
                    enablePassword: enable_password,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'execute_cisco_command': {
                const { host, command, mode = 'user' } = args;
                const result = await connectionManager.executeCommand(host, command, mode);
                return {
                    content: [
                        {
                            type: 'text',
                            text: result,
                        },
                    ],
                };
            }
            case 'disconnect_cisco_device': {
                const { host } = args;
                const result = await connectionManager.disconnect(host);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'list_connections': {
                const connections = connectionManager.listConnections();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(connections, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Cisco MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map