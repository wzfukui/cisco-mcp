# Cisco MCP Server - Usage Examples

## Basic Connection and Commands

### 1. Connect to a Cisco Device

```json
{
  "tool": "connect_cisco_device",
  "arguments": {
    "host": "192.168.1.1",
    "username": "admin",
    "password": "cisco123",
    "protocol": "ssh",
    "enable_password": "enable123"
  }
}
```

### 2. Execute Basic Show Commands

```json
{
  "tool": "execute_cisco_command",
  "arguments": {
    "host": "192.168.1.1",
    "command": "show version",
    "mode": "user"
  }
}
```

```json
{
  "tool": "execute_cisco_command",
  "arguments": {
    "host": "192.168.1.1",
    "command": "show ip interface brief",
    "mode": "enable"
  }
}
```

### 3. Configuration Commands

```json
{
  "tool": "execute_cisco_command",
  "arguments": {
    "host": "192.168.1.1",
    "command": "interface GigabitEthernet0/1",
    "mode": "config"
  }
}
```

```json
{
  "tool": "execute_cisco_command",
  "arguments": {
    "host": "192.168.1.1",
    "command": "ip address 10.1.1.1 255.255.255.0",
    "mode": "config"
  }
}
```

## Natural Language Examples for AI Assistants

### Network Troubleshooting
**User**: "Check the network connectivity and interface status on router 192.168.1.1"

**AI Assistant will**:
1. Connect to the device
2. Execute: `show ip interface brief`
3. Execute: `show interface status`
4. Execute: `ping 8.8.8.8`

### Device Information
**User**: "Get detailed information about the Cisco switch at 10.0.0.1"

**AI Assistant will**:
1. Connect to the device
2. Execute: `show version`
3. Execute: `show inventory`
4. Execute: `show system`

### VLAN Configuration
**User**: "Create VLAN 100 named 'Sales' on the switch"

**AI Assistant will**:
1. Connect to the device
2. Enter config mode
3. Execute: `vlan 100`
4. Execute: `name Sales`

### Interface Configuration
**User**: "Configure port Gi0/1 for VLAN 10 with description 'Server Port'"

**AI Assistant will**:
1. Connect to the device
2. Enter config mode
3. Execute: `interface GigabitEthernet0/1`
4. Execute: `description Server Port`
5. Execute: `switchport mode access`
6. Execute: `switchport access vlan 10`

## Common Cisco Commands Reference

### Show Commands
- `show version` - Device information and IOS version
- `show running-config` - Current running configuration
- `show startup-config` - Startup configuration
- `show ip interface brief` - IP interface summary
- `show interface status` - Interface status summary
- `show vlan brief` - VLAN information
- `show ip route` - Routing table
- `show arp` - ARP table
- `show mac address-table` - MAC address table
- `show cdp neighbors` - CDP neighbor information
- `show inventory` - Hardware inventory
- `show processes cpu` - CPU utilization
- `show memory` - Memory utilization

### Configuration Commands
- `configure terminal` - Enter global configuration mode
- `interface <interface-name>` - Enter interface configuration
- `ip address <ip> <mask>` - Set IP address
- `no shutdown` - Enable interface
- `shutdown` - Disable interface
- `description <text>` - Set interface description
- `vlan <vlan-id>` - Create or enter VLAN configuration
- `name <vlan-name>` - Set VLAN name
- `switchport mode access` - Set port to access mode
- `switchport access vlan <vlan-id>` - Assign port to VLAN

### Diagnostic Commands
- `ping <destination>` - Test connectivity
- `traceroute <destination>` - Trace network path
- `show tech-support` - Comprehensive diagnostic information
- `show log` - System log messages
- `debug <protocol>` - Enable debugging (use with caution)

## Multi-Device Management

### Managing Multiple Devices
```json
{
  "tool": "list_connections",
  "arguments": {}
}
```

This will show all active connections and their status.

### Disconnect from Device
```json
{
  "tool": "disconnect_cisco_device",
  "arguments": {
    "host": "192.168.1.1"
  }
}
```

## Error Handling

The MCP server provides detailed error messages for:
- Connection failures
- Authentication errors
- Command execution errors
- Network timeouts
- Invalid commands

All errors are returned in a structured format for easy parsing by AI assistants.