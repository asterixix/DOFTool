/**
 * Unit tests for EncryptionService
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock libsodium-wrappers to avoid ESM import issues in vitest
vi.mock('libsodium-wrappers', () => {
  let counter = 0;
  return {
    default: {
      ready: Promise.resolve(),
      crypto_secretbox_KEYBYTES: 32,
      crypto_secretbox_NONCEBYTES: 24,
      crypto_pwhash_SALTBYTES: 16,
      crypto_pwhash_ALG_ARGON2ID13: 2,
      crypto_pwhash_OPSLIMIT_MODERATE: 3,
      crypto_pwhash_MEMLIMIT_MODERATE: 268435456,
      randombytes_buf: (length: number) => {
        counter++;
        const arr = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          arr[i] = (counter + i) % 256;
        }
        return arr;
      },
      crypto_secretbox_easy: (message: Uint8Array, nonce: Uint8Array, _key: Uint8Array) => {
        // Simple mock encryption:
        // - prepend 16-byte auth tag
        // - XOR message with nonce to ensure ciphertext differs for different nonces
        const result = new Uint8Array(message.length + 16);
        for (let i = 0; i < message.length; i++) {
          result[16 + i] = message[i] ^ nonce[i % nonce.length];
        }
        return result;
      },
      crypto_secretbox_open_easy: (ciphertext: Uint8Array, nonce: Uint8Array, _key: Uint8Array) => {
        // Simple mock decryption:
        // - remove the 16-byte auth tag prefix
        // - XOR with nonce to reverse the encryption step
        const body = ciphertext.slice(16);
        const result = new Uint8Array(body.length);
        for (let i = 0; i < body.length; i++) {
          result[i] = body[i] ^ nonce[i % nonce.length];
        }
        return result;
      },
      crypto_pwhash: (
        keyLength: number,
        password: string,
        salt: Uint8Array,
        _opsLimit: number,
        _memLimit: number,
        _algorithm: number
      ) => {
        // Generate deterministic key based on password and salt
        const result = new Uint8Array(keyLength);
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
          hash = ((hash << 5) - hash + password.charCodeAt(i)) | 0;
        }
        for (let i = 0; i < salt.length; i++) {
          hash = ((hash << 5) - hash + salt[i]) | 0;
        }
        for (let i = 0; i < keyLength; i++) {
          result[i] = (hash + i) % 256;
        }
        return result;
      },
      memzero: () => {
        // No-op for tests
      },
      memcmp: (a: Uint8Array, b: Uint8Array) => {
        if (a.length !== b.length) {
          return false;
        }
        let diff = 0;
        for (let i = 0; i < a.length; i++) {
          diff |= a[i] ^ b[i];
        }
        return diff === 0;
      },
    },
  };
});

import { EncryptionService } from './EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeAll(async () => {
    service = new EncryptionService();
    await service.initialize();
  });

  describe('initialize', () => {
    it('should initialize libsodium', async () => {
      const newService = new EncryptionService();
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initialization calls', async () => {
      const newService = new EncryptionService();
      await newService.initialize();
      await expect(newService.initialize()).resolves.not.toThrow();
    });
  });

  describe('generateKey', () => {
    it('should generate a valid encryption key', () => {
      const key = service.generateKey();
      expect(key).toBeDefined();
      expect(key.key).toBeInstanceOf(Uint8Array);
      expect(key.key.length).toBe(32); // 256-bit key
      expect(key.id).toBeDefined();
      expect(typeof key.id).toBe('string');
    });

    it('should generate unique keys', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();
      expect(key1.id).not.toBe(key2.id);
    });

    it('should throw if not initialized', () => {
      const uninitializedService = new EncryptionService();
      expect(() => uninitializedService.generateKey()).toThrow('not initialized');
    });
  });

  describe('generateSalt', () => {
    it('should generate a valid salt', () => {
      const salt = service.generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16); // crypto_pwhash_SALTBYTES
    });

    it('should generate unique salts', () => {
      const salt1 = service.generateSalt();
      const salt2 = service.generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('deriveKeyFromPassphrase', () => {
    it('should derive a key from passphrase', () => {
      const salt = service.generateSalt();
      const key = service.deriveKeyFromPassphrase('test-passphrase', salt);
      expect(key).toBeDefined();
      expect(key.key).toBeInstanceOf(Uint8Array);
      expect(key.key.length).toBe(32);
    });

    it('should derive same key for same passphrase and salt', () => {
      const salt = service.generateSalt();
      const key1 = service.deriveKeyFromPassphrase('same-passphrase', salt);
      const key2 = service.deriveKeyFromPassphrase('same-passphrase', salt);
      expect(key1.key).toEqual(key2.key);
    });

    it('should derive different keys for different passphrases', () => {
      const salt = service.generateSalt();
      const key1 = service.deriveKeyFromPassphrase('passphrase1', salt);
      const key2 = service.deriveKeyFromPassphrase('passphrase2', salt);
      expect(key1.key).not.toEqual(key2.key);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data', () => {
      const key = service.generateKey();
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = service.encrypt(originalData, key);
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce).toBeInstanceOf(Uint8Array);
      expect(encrypted.keyId).toBe(key.id);

      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted).toEqual(originalData);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const key = service.generateKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted1 = service.encrypt(data, key);
      const encrypted2 = service.encrypt(data, key);

      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    });

    it('should fail decryption with wrong key', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = service.encrypt(data, key1);

      expect(() => service.decrypt(encrypted, key2)).toThrow('Key ID mismatch');
    });
  });

  describe('encryptString and decryptString', () => {
    it('should encrypt and decrypt strings', () => {
      const key = service.generateKey();
      const originalText = 'Hello, World! 🌍';

      const encrypted = service.encryptString(originalText, key);
      const decrypted = service.decryptString(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should handle empty strings', () => {
      const key = service.generateKey();
      const encrypted = service.encryptString('', key);
      const decrypted = service.decryptString(encrypted, key);
      expect(decrypted).toBe('');
    });

    it('should handle long strings', () => {
      const key = service.generateKey();
      const longText = 'A'.repeat(10000);
      const encrypted = service.encryptString(longText, key);
      const decrypted = service.decryptString(encrypted, key);
      expect(decrypted).toBe(longText);
    });
  });

  describe('hash and hashString', () => {
    it('should hash data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = service.hash(data);
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32); // SHA-256
    });

    it('should produce consistent hashes', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);
      expect(hash1).toEqual(hash2);
    });

    it('should hash strings', () => {
      const hash = service.hashString('test');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex
    });

    it('should produce consistent string hashes', () => {
      const hash1 = service.hashString('test');
      const hash2 = service.hashString('test');
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateToken', () => {
    it('should generate a token with default length', () => {
      const token = service.generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    });

    it('should generate a token with custom length', () => {
      const token = service.generateToken(16);
      expect(token.length).toBe(32); // 16 bytes * 2 (hex)
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('constantTimeEqual', () => {
    it('should return true for equal arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3]);
      expect(service.constantTimeEqual(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 4]);
      expect(service.constantTimeEqual(a, b)).toBe(false);
    });
  });

  describe('secureZero', () => {
    it('should zero memory', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      service.secureZero(data);
      expect(data.every((byte) => byte === 0)).toBe(true);
    });

    it('should handle empty array', () => {
      const data = new Uint8Array([]);
      expect(() => service.secureZero(data)).not.toThrow();
    });
  });

  describe('disposeKey', () => {
    it('should securely dispose of a key', () => {
      const key = service.generateKey();
      service.disposeKey(key);
      expect(key.key.every((byte) => byte === 0)).toBe(true);
    });
  });

  describe('generateSecureId', () => {
    it('should generate a URL-safe base64 ID', () => {
      const id = service.generateSecureId();
      expect(typeof id).toBe('string');
      // URL-safe base64 should not contain + or /
      expect(id).not.toMatch(/[+/]/);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateSecureId();
      const id2 = service.generateSecureId();
      expect(id1).not.toBe(id2);
    });

    it('should respect byte length parameter', () => {
      const id = service.generateSecureId(32);
      // 32 bytes in URL-safe base64 without padding
      expect(id.length).toBeGreaterThan(40);
    });
  });
});
