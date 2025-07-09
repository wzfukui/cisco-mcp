/* eslint-disable @typescript-eslint/consistent-type-imports */

declare module 'telnet-client' {
  class Telnet {
    connect(opts: any): Promise<void>;
    exec(cmd: string, opts?: any): Promise<string>;
    end(): Promise<void>;
  }
  export { Telnet };
  export default Telnet;
}

// 如果 TypeScript 仍然无法解析 ssh2，可在此取消注释。
// declare module 'ssh2'; 