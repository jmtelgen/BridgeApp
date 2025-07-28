import { DDSInstance } from '../../../types/dds-types';

export async function loadDDS(): Promise<DDSInstance> {
  const moduleFactory = await import('../dds.js') as any;
  const instance: DDSInstance = await moduleFactory.default({
    locateFile(path: string) {
      return new URL('../dds.wasm', import.meta.url).href;
    }
  });
  return instance;
}