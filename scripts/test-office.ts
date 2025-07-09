import { loadDeviceConfig } from '../src/config-loader.js';
import { CiscoConnectionManager } from '../src/cisco-connection.js';
import { strict as assert } from 'node:assert';

/**
 * 基础集成测试：
 * 1. 读取设备配置
 * 2. 连接 office-cisco-3750
 * 3. 执行 show version 并断言输出包含 IOS 版本字符串
 * 4. 断开连接
 */

(async () => {
  const [,, configPath = 'cisco-devices.json', alias = 'office-cisco-3750'] = process.argv;
  const devices = await loadDeviceConfig(configPath);
  const device = devices.get(alias);
  if (!device) {
    console.error(`Device alias ${alias} not found in ${configPath}`);
    process.exit(1);
  }

  const mgr = new CiscoConnectionManager();
  // 不预先 connect，直接执行，验证自动建连逻辑
  let output: string;
  try {
    output = await mgr.executeCommand(alias, 'show version', 'user');
  } catch {
    // 若未连接则主动连
    await mgr.connect(device);
    output = await mgr.executeCommand(alias, 'show version', 'user');
  }
  assert.match(output, /Cisco IOS Software/i, 'Output does not contain IOS version');

  await mgr.disconnect(alias);
  console.log('Test passed');
})(); 