# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of DOFTool seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT open public GitHub issues for security vulnerabilities.**

Instead, report vulnerabilities through one of these channels:

1. **GitHub Security Advisories** (Preferred)
   - Go to [Security Advisories](https://github.com/asterixix/DOFTool/security/advisories/new)
   - Click "Report a vulnerability"
   - Provide detailed information about the issue

2. **Email**
   - Send details to: **artur@sendyka.dev**
   - Use subject line: `[SECURITY] DOFTool Vulnerability Report`
   - If possible, encrypt your message (PGP key available on request)

### What to Include

Please provide as much information as possible:

- **Type of vulnerability** (e.g., encryption flaw, data leak, XSS, injection)
- **Affected components** (e.g., EncryptionService, sync protocol, IPC)
- **Steps to reproduce** the vulnerability
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up questions

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt within 48 hours
2. **Assessment**: We will assess the vulnerability and its impact
3. **Updates**: We will keep you informed of our progress
4. **Fix**: We will work on a fix and coordinate disclosure
5. **Credit**: We will credit you in the release notes (unless you prefer anonymity)

### Disclosure Policy

- We follow responsible disclosure practices
- We aim to release fixes within 90 days of report
- We will coordinate public disclosure with the reporter
- We will not take legal action against good-faith security researchers

## Security Model Overview

DOFTool implements a zero-knowledge, end-to-end encrypted architecture:

### Cryptographic Primitives

| Purpose               | Algorithm                  |
| --------------------- | -------------------------- |
| Symmetric Encryption  | XChaCha20-Poly1305         |
| Asymmetric Encryption | X25519 + XSalsa20-Poly1305 |
| Key Derivation        | Argon2id                   |
| Digital Signatures    | Ed25519                    |
| Hashing               | BLAKE2b                    |

### Security Guarantees

- **End-to-End Encryption**: All data is encrypted before leaving the device
- **Zero Knowledge**: No server or relay can read family data
- **Local-First**: Data stays on your devices
- **Forward Secrecy**: Session keys protect against future compromise

### Known Limitations

- **Quantum Computing**: Current algorithms are not quantum-safe
- **Device Security**: If a device is compromised, local data may be exposed
- **Admin Trust**: Family admins have full access by design

For the complete security model, see [docs/SECURITY.md](docs/SECURITY.md).

## Security Best Practices for Users

1. **Use a strong passphrase** when creating a family
2. **Keep your devices secure** with up-to-date OS and security patches
3. **Share invite links securely** - don't post them publicly
4. **Review family members** periodically and remove untrusted devices
5. **Export backups** regularly to protect against data loss

## Acknowledgments

We thank the following security researchers for their responsible disclosures:

_No disclosures yet - be the first!_

---

Thank you for helping keep DOFTool and its users safe!
