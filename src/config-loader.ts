export interface DeviceConfig {
  alias: string;
  host: string;
  username: string;
  password: string;
  protocol?: 'ssh' | 'telnet';
  port?: number;
  enablePassword?: string;
}

/**
 * 从指定 JSON 文件加载设备配置。
 * 若路径为空或加载失败，则返回空 Map。
 */
export async function loadDeviceConfig(filePath?: string): Promise<Map<string, DeviceConfig>> {
  const map = new Map<string, DeviceConfig>();
  if (!filePath) return map;
  try {
    const raw = await import('fs/promises').then(fs => fs.readFile(filePath, 'utf-8'));
    const devices = JSON.parse(raw) as DeviceConfig[];
    if (Array.isArray(devices)) {
      devices.forEach(dev => {
        if (dev.alias) {
          map.set(dev.alias, dev);
        }
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load device config from ${filePath}:`, msg);
  }
  return map;
} 