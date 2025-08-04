import { DDSInstance } from '../../../types/dds-types';

export async function loadDDS(): Promise<DDSInstance> {
  try {
    // @ts-ignore
    const moduleFactory = await import('./dds.js') as any;
    
    // Fetch the WASM file directly
    const wasmUrl = new URL('./dds.wasm', import.meta.url).href;
    const wasmResponse = await fetch(wasmUrl);
    
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM file: ${wasmResponse.status} ${wasmResponse.statusText}`);
    }
    
    const wasmBinary = await wasmResponse.arrayBuffer();

    const instance: DDSInstance = await moduleFactory.default({
      wasmBinary,
      noInitialRun: true,
      noExitRuntime: true,
    });
    
    return instance;
  } catch (error) {
    console.error('Failed to load DDS:', error);
    throw new Error(`DDS loading failed: ${error}`);
  }
}