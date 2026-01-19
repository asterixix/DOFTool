/**
 * Encryption Service - Handles all encryption operations using libsodium
 */

import * as crypto from 'crypto';

import * as sodiumModule from 'libsodium-wrappers';

type SodiumApi = typeof sodiumModule;

const sodiumDefault = (sodiumModule as unknown as { default?: SodiumApi }).default;
const sodiumNamespace: SodiumApi = sodiumModule;

function hasRandomBytesBuf(api: SodiumApi): boolean {
  return typeof (api as unknown as { randombytes_buf?: unknown }).randombytes_buf === 'function';
}

function resolveSodiumApi(): SodiumApi {
  return sodiumDefault && hasRandomBytesBuf(sodiumDefault) ? sodiumDefault : sodiumNamespace;
}

export interface EncryptionKey {
  /** Raw key bytes (32 bytes for XChaCha20-Poly1305) */
  key: Uint8Array;

  /** Key ID for reference */
  id: string;
}

export interface EncryptedData {
  /** Encrypted data */
  ciphertext: Uint8Array;

  /** Nonce used for encryption */
  nonce: Uint8Array;

  /** Key ID used for encryption */
  keyId: string;
}

export class EncryptionService {
  private initialized = false;
  private sodium: SodiumApi | null = null;

  /**
   * Initialize libsodium
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    const candidate = sodiumDefault ?? sodiumNamespace;
    await candidate.ready;
    const resolved = resolveSodiumApi();
    this.sodium = resolved;
    if (!hasRandomBytesBuf(resolved)) {
      console.warn('[EncryptionService] libsodium randombytes_buf not available, using fallback');
    }
    this.initialized = true;
    console.error('[EncryptionService] Initialized with libsodium');
  }

  /**
   * Generate a new encryption key (32 bytes for XChaCha20-Poly1305)
   */
  generateKey(): EncryptionKey {
    this.ensureInitialized();
    const sodium = this.getSodium();

    // Additional safety check - ensure sodium functions are available
    if (!sodium.randombytes_buf) {
      throw new Error('libsodium randombytes_buf function not available');
    }

    const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
    const id = this.generateKeyId();
    return { key, id };
  }

  /**
   * Derive a key from a passphrase using Argon2id
   */
  deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): EncryptionKey {
    this.ensureInitialized();
    const sodium = this.getSodium();

    // Use crypto_pwhash with Argon2id
    const keyLength = sodium.crypto_secretbox_KEYBYTES;
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE;
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE;

    const key = sodium.crypto_pwhash(
      keyLength,
      passphrase,
      salt,
      opsLimit,
      memLimit,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    const id = this.generateKeyId();
    return { key, id };
  }

  /**
   * Generate a random salt for key derivation
   */
  generateSalt(): Uint8Array {
    this.ensureInitialized();
    const sodium = this.getSodium();

    // Additional safety check - ensure sodium functions are available
    if (!sodium.randombytes_buf) {
      throw new Error('libsodium randombytes_buf function not available');
    }

    return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  }

  /**
   * Encrypt data using XChaCha20-Poly1305
   */
  encrypt(data: Uint8Array, key: EncryptionKey): EncryptedData {
    this.ensureInitialized();
    const sodium = this.getSodium();

    // Additional safety check - ensure sodium functions are available
    if (!sodium.randombytes_buf || !sodium.crypto_secretbox_easy) {
      throw new Error('libsodium encryption functions not available');
    }

    // Generate random nonce (24 bytes for XChaCha20)
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    // Encrypt using secretbox (XChaCha20-Poly1305)
    const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key.key);

    return {
      ciphertext,
      nonce,
      keyId: key.id,
    };
  }

  /**
   * Decrypt data using XChaCha20-Poly1305
   */
  decrypt(encrypted: EncryptedData, key: EncryptionKey): Uint8Array {
    this.ensureInitialized();
    const sodium = this.getSodium();

    if (encrypted.keyId !== key.id) {
      throw new Error('Key ID mismatch. Cannot decrypt with this key.');
    }

    try {
      const plaintext = sodium.crypto_secretbox_open_easy(
        encrypted.ciphertext,
        encrypted.nonce,
        key.key
      );

      return plaintext;
    } catch {
      throw new Error('Decryption failed. Invalid key or corrupted data.');
    }
  }

  /**
   * Encrypt a string (UTF-8 encoding)
   */
  encryptString(text: string, key: EncryptionKey): EncryptedData {
    const data = new TextEncoder().encode(text);
    return this.encrypt(data, key);
  }

  /**
   * Decrypt to a string (UTF-8 decoding)
   */
  decryptString(encrypted: EncryptedData, key: EncryptionKey): string {
    const data = this.decrypt(encrypted, key);
    return new TextDecoder().decode(data);
  }

  /**
   * Generate a key ID (hex string)
   */
  private generateKeyId(): string {
    this.ensureInitialized();
    const randomBytes = this.getRandomBytes(16);
    return Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Hash data using SHA-256 (Node.js crypto)
   * Note: Using Node.js crypto instead of libsodium crypto_generichash
   * for thread ID generation (non-security-critical use case)
   */
  hash(data: Uint8Array): Uint8Array {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return new Uint8Array(hash.digest());
  }

  /**
   * Hash a string
   */
  hashString(text: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(text, 'utf8');
    return hash.digest('hex');
  }

  /**
   * Generate a random token (for family invitations)
   */
  generateToken(length = 32): string {
    this.ensureInitialized();
    const bytes = this.getRandomBytes(length);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Secure comparison (constant time)
   */
  constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    this.ensureInitialized();
    return this.getSodium().memcmp(a, b);
  }

  /**
   * Securely zero memory containing sensitive data
   * Call this when keys or sensitive data are no longer needed
   */
  secureZero(data: Uint8Array): void {
    this.ensureInitialized();
    if (data && data.length > 0) {
      data.fill(0);
      this.getSodium().memzero(data);
    }
  }

  /**
   * Securely dispose of an encryption key
   * Zeros the key bytes before allowing garbage collection
   */
  disposeKey(key: EncryptionKey): void {
    if (key?.key) {
      this.secureZero(key.key);
    }
  }

  /**
   * Generate a cryptographically secure random string (URL-safe base64)
   */
  generateSecureId(byteLength = 16): string {
    this.ensureInitialized();
    const bytes = this.getRandomBytes(byteLength);
    return Buffer.from(bytes).toString('base64url');
  }

  private getRandomBytes(length: number): Uint8Array {
    const sodium = this.getSodium();
    if (sodium.randombytes_buf) {
      return sodium.randombytes_buf(length);
    }
    return new Uint8Array(crypto.randomBytes(length));
  }

  private getSodium(): SodiumApi {
    if (!this.sodium) {
      throw new Error('EncryptionService not initialized. Call initialize() first.');
    }
    return this.sodium;
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.sodium) {
      throw new Error('EncryptionService not initialized. Call initialize() first.');
    }
  }
}
