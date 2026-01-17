# DOFTool Security Model

This document describes the end-to-end encryption (E2EE) architecture, key management, and security practices for DOFTool.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Cryptographic Primitives](#cryptographic-primitives)
3. [Key Hierarchy](#key-hierarchy)
4. [Encryption Flows](#encryption-flows)
5. [Family Invitation Security](#family-invitation-security)
6. [Device Authentication](#device-authentication)
7. [Data Protection](#data-protection)
8. [Threat Model](#threat-model)
9. [Security Best Practices](#security-best-practices)

---

## Security Overview

DOFTool implements a **zero-knowledge, end-to-end encrypted** architecture where:

- All data is encrypted before leaving the device
- Only family members with the correct keys can decrypt data
- No server or relay can read family data
- Keys never leave devices in plaintext
- Forward secrecy protects against future key compromise

### Security Guarantees

| Guarantee           | Description                                         |
| ------------------- | --------------------------------------------------- |
| **Confidentiality** | Only family members can read data                   |
| **Integrity**       | Tampering is detected via authenticated encryption  |
| **Authenticity**    | Messages are verifiably from family members         |
| **Forward Secrecy** | Past sessions remain secure if keys are compromised |
| **Local-First**     | Data never touches external servers unencrypted     |

---

## Cryptographic Primitives

DOFTool uses **libsodium** for all cryptographic operations:

| Purpose               | Algorithm                  | Library                |
| --------------------- | -------------------------- | ---------------------- |
| Symmetric Encryption  | XChaCha20-Poly1305         | `crypto_secretbox_*`   |
| Asymmetric Encryption | X25519 + XSalsa20-Poly1305 | `crypto_box_*`         |
| Key Derivation        | Argon2id                   | `crypto_pwhash_*`      |
| Digital Signatures    | Ed25519                    | `crypto_sign_*`        |
| Hashing               | BLAKE2b                    | `crypto_generichash_*` |
| Random Generation     | ChaCha20 CSPRNG            | `randombytes_buf`      |

### Why These Choices?

- **XChaCha20-Poly1305**: Fast, secure, resistant to timing attacks, 24-byte nonce prevents reuse
- **Argon2id**: Memory-hard KDF, resistant to GPU/ASIC attacks
- **Ed25519**: Fast signatures, small keys, deterministic
- **X25519**: Efficient key exchange, widely audited

---

## Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Key Hierarchy                                    │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   Admin Passphrase   │  (Never stored)
                    │   (User memory)      │
                    └──────────┬───────────┘
                               │
                               │ Argon2id (salt, m=256MB, t=3, p=4)
                               ▼
                    ┌──────────────────────┐
                    │  Family Master Key   │  32 bytes
                    │       (FMK)          │  (Stored encrypted with device key)
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Data Encryption │  │   Member Keys   │  │   Device Keys   │
│   Key (DEK)     │  │  (Per Member)   │  │  (Per Device)   │
│                 │  │                 │  │                 │
│ Encrypts:       │  │ - Public Key    │  │ - Public Key    │
│ - Yjs documents │  │ - Private Key   │  │ - Private Key   │
│ - Local storage │  │                 │  │                 │
│ - Email cache   │  │ Used for:       │  │ Used for:       │
└─────────────────┘  │ - Signatures    │  │ - Device auth   │
                     │ - Key exchange  │  │ - FMK storage   │
                     └─────────────────┘  └─────────────────┘
```

### Key Descriptions

#### Family Master Key (FMK)

- **Derivation**: Argon2id from admin passphrase + random salt
- **Length**: 32 bytes (256 bits)
- **Storage**: Encrypted with each device's key, stored locally
- **Rotation**: Possible via admin, re-encrypts all data

#### Data Encryption Key (DEK)

- **Derivation**: HKDF from FMK with context "data-encryption"
- **Length**: 32 bytes
- **Purpose**: Encrypts all Yjs documents and local storage

#### Member Keys

- **Type**: Ed25519 key pairs (signing) + X25519 key pairs (encryption)
- **Generation**: On member device during registration
- **Storage**: Private key encrypted with FMK, public key shared

#### Device Keys

- **Type**: X25519 key pairs
- **Generation**: On first app launch
- **Storage**: OS-provided secure storage (Keychain, Credential Manager)
- **Purpose**: Authenticate device, encrypt FMK for local storage

---

## Encryption Flows

### Data Encryption (At Rest)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Data Encryption Flow                                  │
└─────────────────────────────────────────────────────────────────────────┘

  Plaintext Data                              Encrypted Storage
  ──────────────                              ─────────────────
       │
       │  1. Serialize to bytes
       ▼
  ┌──────────┐
  │ Compress │  (optional, for large data)
  │  (zstd)  │
  └────┬─────┘
       │
       │  2. Generate random nonce (24 bytes)
       ▼
  ┌────────────────────────────────────┐
  │   XChaCha20-Poly1305 Encrypt       │
  │   Key: DEK                         │
  │   Nonce: random 24 bytes           │
  │   AD: version + metadata           │
  └────────────────┬───────────────────┘
                   │
                   │  3. Prepend version + nonce
                   ▼
              ┌─────────────────────────────────┐
              │  Version (1) | Nonce (24) |     │
              │  Ciphertext | Auth Tag (16)     │
              └─────────────────────────────────┘
                              │
                              │  4. Write to LevelDB
                              ▼
                         ┌─────────┐
                         │ LevelDB │
                         └─────────┘
```

### Key Exchange (Device Joining)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Key Exchange Flow                                     │
└─────────────────────────────────────────────────────────────────────────┘

  Admin Device (A)                           New Device (B)
  ────────────────                           ──────────────
       │                                          │
       │  1. Generate invite with tempKeyPair     │
       │                                          │
       │  QR Code contains:                       │
       │  - familyId                              │
       │  - tempPublicKey                         │
       │  - token                                 │
       │  - expiry                                │
       ├─────────────────────────────────────────▶│
       │                                          │
       │                          2. Generate device keypair
       │                             Parse invite token
       │                                          │
       │◀─────────────────────────────────────────┤
       │  3. WebRTC connection (DTLS encrypted)   │
       │     B sends: devicePublicKey, token      │
       │                                          │
       │  4. Verify token signature               │
       │                                          │
       │  5. Encrypt FMK for device B:            │
       │     box = crypto_box_seal(               │
       │       FMK, B.devicePublicKey             │
       │     )                                    │
       │                                          │
       ├─────────────────────────────────────────▶│
       │  6. Send encrypted FMK                   │
       │                                          │
       │                          7. Decrypt FMK with
       │                             device private key
       │                                          │
       │                          8. Derive DEK from FMK
       │                          9. Store FMK encrypted
       │                             with device key
       │                                          │
       ▼                                          ▼
  [Sync begins]                            [Sync begins]
```

### Yjs Sync Encryption

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Yjs Sync Encryption                                   │
└─────────────────────────────────────────────────────────────────────────┘

  Device A                                    Device B
  ────────                                    ────────
       │                                          │
       │  1. Yjs generates update (binary)        │
       │                                          │
       │  2. Encrypt update:                      │
       │     nonce = random(24)                   │
       │     ct = secretbox(update, nonce, DEK)   │
       │     msg = nonce || ct || tag             │
       │                                          │
       ├─────────────────────────────────────────▶│
       │  3. Send over WebRTC (DTLS)              │
       │                                          │
       │                          4. Decrypt:
       │                             nonce = msg[0:24]
       │                             ct = msg[24:-16]
       │                             update = secretbox_open(ct, nonce, DEK)
       │                                          │
       │                          5. Apply Yjs update
       │                                          │
       │◀─────────────────────────────────────────┤
       │  6. Same process for B → A               │
       │                                          │
       ▼                                          ▼
```

---

## Family Invitation Security

### Token Generation

```typescript
interface InviteToken {
  // Token structure (JSON, then encrypted)
  familyId: string; // UUID of family
  tempPublicKey: string; // Base64 X25519 public key
  token: string; // Random 32-byte token (base64)
  signature: string; // Ed25519 signature by admin
  exp: number; // Unix timestamp expiration
  role: MemberRole; // Role to assign
}

// Generation process
function generateInviteToken(
  family: Family,
  adminSigningKey: Uint8Array,
  role: MemberRole,
  expiresInHours: number = 24
): string {
  // 1. Generate temporary keypair for this invite
  const tempKeyPair = sodium.crypto_box_keypair();

  // 2. Generate random token
  const token = sodium.randombytes_buf(32);

  // 3. Create payload
  const payload = {
    familyId: family.id,
    tempPublicKey: sodium.to_base64(tempKeyPair.publicKey),
    token: sodium.to_base64(token),
    exp: Date.now() + expiresInHours * 3600000,
    role,
  };

  // 4. Sign payload
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = sodium.crypto_sign_detached(payloadBytes, adminSigningKey);

  // 5. Encode for QR/sharing
  return base64url.encode(
    JSON.stringify({
      ...payload,
      signature: sodium.to_base64(signature),
    })
  );
}
```

### Token Verification

```typescript
async function verifyInviteToken(
  tokenString: string,
  adminPublicKey: Uint8Array
): Promise<InviteTokenPayload | null> {
  try {
    // 1. Decode token
    const token = JSON.parse(base64url.decode(tokenString));

    // 2. Check expiration
    if (Date.now() > token.exp) {
      throw new Error('Token expired');
    }

    // 3. Verify signature
    const payload = { ...token };
    delete payload.signature;
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const signature = sodium.from_base64(token.signature);

    const valid = sodium.crypto_sign_verify_detached(signature, payloadBytes, adminPublicKey);

    if (!valid) {
      throw new Error('Invalid signature');
    }

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
```

### QR Code Security

- QR codes contain the full invite token (encrypted)
- Tokens are single-use or limited-use
- Default expiration: 24 hours
- Tokens can be revoked by admin
- Failed verification attempts are rate-limited

---

## Device Authentication

### First Launch (New Device)

```typescript
async function initializeDevice(): Promise<DeviceKeys> {
  // 1. Generate device keypair
  const keyPair = sodium.crypto_box_keypair();

  // 2. Generate device ID
  const deviceId = crypto.randomUUID();

  // 3. Store private key in OS secure storage
  await secureStorage.set('device_private_key', keyPair.privateKey);
  await secureStorage.set('device_id', deviceId);

  // 4. Return public info for registration
  return {
    deviceId,
    publicKey: sodium.to_base64(keyPair.publicKey),
    platform: process.platform,
    appVersion: app.getVersion(),
  };
}
```

### Device Verification

When devices connect:

1. **Identity Check**: Devices exchange signed device IDs
2. **Challenge-Response**: Each device proves possession of private key
3. **Family Membership**: Devices verify each other's family membership via signatures

```typescript
async function verifyPeerDevice(
  peerId: string,
  peerPublicKey: Uint8Array,
  peerSignature: Uint8Array,
  familyId: string
): Promise<boolean> {
  // 1. Verify signature on device ID
  const message = new TextEncoder().encode(`${peerId}:${familyId}`);
  const valid = sodium.crypto_sign_verify_detached(peerSignature, message, peerPublicKey);

  if (!valid) return false;

  // 2. Check if device is in family's device list
  const device = await getDeviceFromYjs(peerId);
  if (!device || device.familyId !== familyId) return false;

  // 3. Verify public key matches stored key
  return device.publicKey === sodium.to_base64(peerPublicKey);
}
```

---

## Data Protection

### At Rest Encryption

All local data is encrypted:

| Data Type     | Encryption         | Key        |
| ------------- | ------------------ | ---------- |
| Yjs Documents | XChaCha20-Poly1305 | DEK        |
| Email Cache   | XChaCha20-Poly1305 | DEK        |
| Attachments   | XChaCha20-Poly1305 | DEK        |
| App Settings  | XChaCha20-Poly1305 | Device Key |
| FMK Storage   | XChaCha20-Poly1305 | Device Key |

### In Transit Encryption

All network communication is encrypted:

| Channel     | Encryption                     |
| ----------- | ------------------------------ |
| WebRTC Data | DTLS 1.3                       |
| Yjs Updates | Application-layer (DEK) + DTLS |
| IMAP/SMTP   | TLS 1.3                        |

### Memory Protection

- Sensitive keys are zeroed after use: `sodium.memzero()`
- Keys never logged or serialized in plaintext
- Electron's `safeStorage` API for OS keychain integration
- EncryptionService provides helper methods for secure memory handling

```typescript
// EncryptionService memory protection APIs
import { encryptionService } from './services/EncryptionService';

// Securely zero sensitive data
encryptionService.secureZero(sensitiveBuffer);

// Securely dispose of encryption key (zeros key bytes)
encryptionService.disposeKey(key);

// Generate cryptographically secure IDs (URL-safe base64)
const secureId = encryptionService.generateSecureId(16);
```

```typescript
// Example: Safe key handling pattern
async function decryptWithKey(
  ciphertext: Uint8Array,
  keyMaterial: Uint8Array
): Promise<Uint8Array> {
  try {
    const nonce = ciphertext.slice(0, 24);
    const ct = ciphertext.slice(24);

    const plaintext = sodium.crypto_secretbox_open_easy(ct, nonce, keyMaterial);
    return plaintext;
  } finally {
    // Always zero sensitive material
    sodium.memzero(keyMaterial);
  }
}
```

### Best Practice: Key Lifecycle

```typescript
// 1. Generate or derive key
const key = encryptionService.deriveKeyFromPassphrase(passphrase, salt);

try {
  // 2. Use key for encryption/decryption
  const encrypted = encryptionService.encrypt(data, key);
  const decrypted = encryptionService.decrypt(encrypted, key);
} finally {
  // 3. ALWAYS dispose of key when done
  encryptionService.disposeKey(key);
}
```

---

## Threat Model

### What We Protect Against

| Threat                    | Mitigation                             |
| ------------------------- | -------------------------------------- |
| **Network Eavesdropping** | E2EE + DTLS                            |
| **Malicious Relay**       | Zero-knowledge (can't read data)       |
| **Device Theft**          | Encrypted storage + device key         |
| **Brute Force**           | Argon2id (memory-hard KDF)             |
| **Replay Attacks**        | Unique nonces, timestamps              |
| **Man-in-the-Middle**     | Signed device keys, challenge-response |
| **Key Compromise**        | Forward secrecy, key rotation          |

### What We Don't Protect Against

| Threat                        | Reason                              |
| ----------------------------- | ----------------------------------- |
| **Compromised Admin Device**  | Admin has full access by design     |
| **Malware on Device**         | Out of scope (OS responsibility)    |
| **Rubber Hose Cryptanalysis** | Physical security not addressed     |
| **Quantum Computing**         | Current algorithms not quantum-safe |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Trust Boundaries                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  TRUSTED: Family Devices                                                 │
│  ─────────────────────────                                              │
│  - Admin device (highest trust)                                         │
│  - Member devices (trusted after invitation)                            │
│  - Keys exist only here                                                 │
│  - Plaintext data accessible here                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ E2EE Boundary
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  UNTRUSTED: Network / External                                          │
│  ────────────────────────────────                                       │
│  - Local network (WiFi)                                                 │
│  - Email providers (IMAP/SMTP)                                          │
│  - Future: relay servers                                                │
│  - All data encrypted before crossing this boundary                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Security Best Practices

### For Users

1. **Strong Passphrase**: Use a long, unique passphrase for family creation
2. **Device Security**: Keep devices locked and updated
3. **Invitation Links**: Share invite QR codes securely, not publicly
4. **Member Review**: Periodically review family members and devices
5. **Revoke Access**: Remove members/devices that are no longer trusted

### For Developers

1. **Never Log Secrets**: Keys, tokens, passwords must never appear in logs
2. **Use Constant-Time Comparison**: For tokens and signatures
3. **Zero Memory**: Always clear sensitive data from memory
4. **Validate All Input**: Especially from IPC and network
5. **Audit Dependencies**: Keep libsodium and crypto deps updated
6. **Test Crypto Code**: Unit tests for all encryption/decryption paths

```typescript
// Example: Constant-time comparison
function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return sodium.compare(a, b) === 0;
}

// Example: Safe error handling (no key leakage)
async function safeDecrypt(ciphertext: Uint8Array): Promise<Uint8Array | null> {
  try {
    return await decrypt(ciphertext);
  } catch (error) {
    // Log generic error, not details that might leak key info
    console.error('Decryption failed');
    return null;
  }
}
```

### Key Rotation

FMK rotation process (admin only):

1. Generate new FMK
2. Re-encrypt all Yjs documents with new DEK
3. Re-encrypt FMK for all devices
4. Broadcast key update to connected devices
5. Devices decrypt new FMK with device key
6. Old key material is securely erased

---

## Security Audit Checklist

Before release, verify:

- [ ] All data at rest is encrypted
- [ ] All network communication uses E2EE
- [ ] Keys are properly derived with Argon2id
- [ ] No sensitive data in logs
- [ ] Memory is zeroed after use
- [ ] Invite tokens are properly validated
- [ ] Device authentication uses challenge-response
- [ ] Rate limiting on sensitive operations
- [ ] Dependencies are up-to-date
- [ ] Electron security best practices followed
  - [ ] Context isolation enabled
  - [ ] Node integration disabled in renderer
  - [ ] Preload scripts minimize exposed APIs
  - [ ] CSP headers configured

---

## Incident Response

If a security issue is discovered:

1. **Report**: Email artur@sendyka.dev or use [GitHub Security Advisories](https://github.com/asterixix/DOFTool/security/advisories/new)
2. **Assessment**: Determine scope and impact
3. **Mitigation**: Push emergency update if needed
4. **Communication**: Notify affected users
5. **Post-Mortem**: Document and improve

See [SECURITY.md](../SECURITY.md) for responsible disclosure policy.
