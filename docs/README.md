# DOFTool Documentation

Welcome to the DOFTool documentation! This guide will help you understand, use, and contribute to DOFTool - a decentralized, offline-first, end-to-end encrypted family collaboration application.

---

## 📚 Documentation Index

### Getting Started

| Document                                          | Description                       |
| ------------------------------------------------- | --------------------------------- |
| [Getting Started](GETTING-STARTED.md)             | Quick start guide for new users   |
| [README](../README.md)                            | Project overview and installation |
| [Environment Variables](ENVIRONMENT-VARIABLES.md) | Configuration options             |

### Architecture & Design

| Document                          | Description                              |
| --------------------------------- | ---------------------------------------- |
| [Architecture](ARCHITECTURE.md)   | System architecture and design decisions |
| [Data Model](DATA-MODEL.md)       | TypeScript interfaces and schemas        |
| [Sync Protocol](SYNC-PROTOCOL.md) | P2P synchronization with Yjs             |
| [Security Model](SECURITY.md)     | E2EE encryption and key management       |

### Development

| Document                           | Description                           |
| ---------------------------------- | ------------------------------------- |
| [Contributing](../CONTRIBUTING.md) | How to contribute to DOFTool          |
| [Testing Guide](TESTING.md)        | Testing guidelines and best practices |
| [API Reference](API.md)            | IPC channels and service APIs         |
| [Design System](DESIGN-SYSTEM.md)  | UI components and styling             |
| [Performance](PERFORMANCE.md)      | Performance optimization guide        |

### Reference

| Document                              | Description                 |
| ------------------------------------- | --------------------------- |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |
| [Changelog](CHANGELOG.md)             | Version history and changes |
| [Status](STATUS.md)                   | Current module status       |
| [Brand Strategy](brand-strategy.md)   | Branding guidelines         |

### Policies

| Document                                 | Description             |
| ---------------------------------------- | ----------------------- |
| [Security Policy](../SECURITY.md)        | Vulnerability reporting |
| [Code of Conduct](../CODE_OF_CONDUCT.md) | Community guidelines    |
| [License](../LICENSE)                    | MIT License             |

---

## 🎯 Quick Links

### For Users

- **New to DOFTool?** Start with [Getting Started](GETTING-STARTED.md)
- **Having issues?** Check [Troubleshooting](TROUBLESHOOTING.md)
- **Want to understand security?** Read [Security Model](SECURITY.md)

### For Developers

- **Want to contribute?** Read [Contributing](../CONTRIBUTING.md)
- **Understanding the codebase?** Start with [Architecture](ARCHITECTURE.md)
- **Writing tests?** See [Testing Guide](TESTING.md)
- **Building UI?** Check [Design System](DESIGN-SYSTEM.md)

---

## 🏗️ Project Overview

DOFTool (Decentralized Organization Family Tool) is a desktop application that enables families to:

- **📅 Share Calendars** - Create events, set reminders, sync across devices
- **✅ Manage Tasks** - Organize to-dos, assign family members, track progress
- **📧 Handle Email** - Full IMAP/SMTP client with shared access _(in development)_
- **🔒 Stay Private** - End-to-end encryption, zero-knowledge architecture
- **🔄 Sync Automatically** - P2P sync over local network, no cloud required

### Key Features

| Feature           | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| **Offline-First** | Works without internet, syncs when connected                  |
| **E2E Encrypted** | XChaCha20-Poly1305 encryption, only your family can read data |
| **P2P Sync**      | Direct device-to-device sync via mDNS/WebRTC                  |
| **CRDT-Based**    | Yjs ensures conflict-free merging                             |
| **Open Source**   | MIT licensed, audit the code yourself                         |

---

## 🛠️ Tech Stack

| Category     | Technology                               |
| ------------ | ---------------------------------------- |
| **Runtime**  | Electron 33+                             |
| **Frontend** | React 19, TypeScript 5.5+                |
| **Build**    | Vite                                     |
| **UI**       | shadcn/ui, Tailwind CSS 4, Framer Motion |
| **State**    | Zustand, React Query                     |
| **Data**     | Yjs (CRDT), LevelDB                      |
| **Crypto**   | libsodium-wrappers                       |
| **Sync**     | y-webrtc, mDNS (bonjour-service)         |

---

## 📖 Document Conventions

Throughout the documentation:

- `code` - Code snippets, file names, commands
- **Bold** - Important terms or UI elements
- _Italic_ - Emphasis or new concepts
- > Blockquotes - Tips, warnings, or notes
- Tables - Structured information

### Code Examples

```typescript
// TypeScript examples use syntax highlighting
interface Example {
  property: string;
}
```

```bash
# Shell commands are prefixed with comments
npm run dev
```

---

## 🤝 Contributing to Documentation

Found an error or want to improve the docs?

1. Fork the repository
2. Edit the relevant `.md` file in `/docs`
3. Submit a pull request

See [Contributing](../CONTRIBUTING.md) for detailed guidelines.

---

## 📬 Contact

- **Author**: Artur Sendyka
- **Email**: artur@sendyka.dev
- **GitHub**: [github.com/asterixix/DOFTool](https://github.com/asterixix/DOFTool)
