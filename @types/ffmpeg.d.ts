declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(options?: { 
    log?: boolean;
    corePath?: string;
    logger?: (message: any) => void;
  }): FFmpeg;

  export function fetchFile(file: File | string | URL): Promise<Uint8Array>;

  export interface FFmpeg {
    load(): Promise<void>;
    run(...args: string[]): Promise<void>;
    FS(command: string, ...args: any[]): any;
    setProgress(handler: (event: { ratio: number }) => void): void;
    exit(): void;
  }
} 