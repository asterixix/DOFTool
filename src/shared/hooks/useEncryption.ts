/**
 * React hook for encryption operations
 */

import { useCallback } from 'react';

interface EncryptionAPI {
  generateKey: () => Promise<{ id: string; key: number[] }>;
  hashString: (text: string) => Promise<string>;
  generateToken: (length?: number) => Promise<string>;
}

interface WindowAPI {
  encryption: EncryptionAPI;
}

export function useEncryption(): {
  generateKey: () => Promise<{ id: string; key: number[] }>;
  hashString: (text: string) => Promise<string>;
  generateToken: (length?: number) => Promise<string>;
} {
  const generateKey = useCallback(async () => {
    if (!window.electronAPI) {
      throw new Error('ElectronAPI not available');
    }
    return await (window.electronAPI as unknown as WindowAPI).encryption.generateKey();
  }, []);

  const hashString = useCallback(async (text: string): Promise<string> => {
    if (!window.electronAPI) {
      throw new Error('ElectronAPI not available');
    }
    return await (window.electronAPI as unknown as WindowAPI).encryption.hashString(text);
  }, []);

  const generateToken = useCallback(async (length?: number): Promise<string> => {
    if (!window.electronAPI) {
      throw new Error('ElectronAPI not available');
    }
    return await (window.electronAPI as unknown as WindowAPI).encryption.generateToken(length);
  }, []);

  return {
    generateKey,
    hashString,
    generateToken,
  };
}
