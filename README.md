# DOFTool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Decentralized, offline-first, end-to-end encrypted family collaboration for Calendar, Tasks, and Email.**

DOFTool is a privacy-focused desktop application that helps families stay organized with shared calendars, tasks, and email management. Your data stays private with zero-knowledge encryption and syncs automatically between family devices over your local network—no cloud servers required.

---

## Features

### Family Management

- Create a family and invite members via QR code or token
- Role-based permissions (Admin, Parent, Child, Guest)
- Device management with per-device access controls
- Secure family data with end-to-end encryption

### Calendar

- Create multiple calendars with custom colors
- Schedule events with recurrence support
- Set reminders and notifications
- Import/Export via iCal format
- Per-calendar and per-event sharing permissions

### Tasks

- Organize tasks into lists
- Set priorities, due dates, and assignees
- Subtasks and checklists
- Kanban board view
- Import/Export via JSON

### Email _(In Development)_

- Full IMAP/SMTP email client
- Connect Gmail, Outlook, and other providers
- Family internal messaging system
- Shared inbox access
- Send-as permissions for family members

> **Note:** The email module is currently being rebuilt. See [STATUS.md](docs/STATUS.md) for details.

### Sync & Privacy

- Offline-first: works without internet
- P2P sync over local WiFi (mDNS discovery)
- Zero-knowledge E2EE (only your family can read data)
- CRDT-based conflict resolution (no data loss)
- No cloud servers required

---

## Screenshots

_Coming soon_

---

## Installation

### Download

Download the latest release for your platform:

| Platform | Download                                                                 |
| -------- | ------------------------------------------------------------------------ |
| Windows  | [DOFTool-win.zip](https://github.com/asterixix/DOFTool/releases/latest)  |
| macOS    | [DOFTool.dmg](https://github.com/asterixix/DOFTool/releases/latest)      |
| Linux    | [DOFTool.AppImage](https://github.com/asterixix/DOFTool/releases/latest) |

> **Note:** DOFTool is currently in active development (v0.1.0). Pre-release builds may be available.

### System Requirements

- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 11 Big Sur or later
- **Linux**: Ubuntu 20.04+, Fedora 34+, or equivalent

---

## Quick Start

### 1. Create a Family

Launch DOFTool and click **"Create Family"**. Enter:

- Family name
- Your display name
- A strong passphrase (this encrypts all family data)

> **Important**: Write down your passphrase! It cannot be recovered.

### 2. Invite Family Members

1. Go to **Settings** → **Family** → **Invite Member**
2. Choose the member's role (Parent, Child, Guest)
3. Share the QR code or copy the invite link
4. The new member scans/enters the code on their device

### 3. Start Syncing

Once devices are on the same WiFi network, they automatically discover and sync with each other. Look for the sync indicator in the status bar.

---

## Development

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Git** >= 2.40

### Setup

```bash
# Clone the repository
git clone https://github.com/asterixix/DOFTool.git
cd DOFTool

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start Electron in development mode |
| `npm run build`     | Build for production               |
| `npm run test`      | Run unit tests                     |
| `npm run test:e2e`  | Run E2E tests                      |
| `npm run lint`      | Lint code                          |
| `npm run format`    | Format code with Prettier          |
| `npm run typecheck` | TypeScript type checking           |

### Project Structure

```
DOFTool/
├── electron/               # Electron main process
│   ├── main.ts             # Main entry point
│   ├── preload.ts          # Preload script (IPC bridge)
│   └── services/           # Core services
│       ├── EncryptionService.ts    # E2EE encryption
│       ├── YjsService.ts           # CRDT sync
│       ├── EmailService.ts         # IMAP/SMTP
│       ├── NotificationService.ts  # System notifications
│       └── ...                     # Other services
├── src/                    # React renderer
│   ├── app/                # App shell, routing, providers
│   ├── components/ui/      # Shared UI components (shadcn/ui)
│   ├── hooks/              # Shared React hooks
│   └── modules/            # Feature modules
│       ├── family/         # Family management
│       ├── calendar/       # Calendar feature
│       ├── tasks/          # Tasks feature
│       ├── email/          # Email client (in development)
│       └── sync/           # Sync status & controls
├── docs/                   # Technical documentation
└── tests/                  # Test files
```

### Building for Production

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

---

## Tech Stack

| Category     | Technology                                |
| ------------ | ----------------------------------------- |
| **Runtime**  | Electron 33+                              |
| **Frontend** | React 19, TypeScript 5.5+                 |
| **Build**    | Vite                                      |
| **UI**       | shadcn/ui, Tailwind CSS 4, Framer Motion  |
| **State**    | Zustand, React Query                      |
| **Data**     | Yjs (CRDT), LevelDB                       |
| **Crypto**   | libsodium-wrappers                        |
| **Sync**     | y-webrtc, mDNS (bonjour-service)          |
| **Email**    | imapflow, nodemailer                      |
| **Calendar** | ical.js, date-fns                         |
| **Testing**  | Vitest, React Testing Library, Playwright |

---

## Documentation

📚 **[Full Documentation Index](docs/README.md)**

### Getting Started

- [Getting Started Guide](docs/GETTING-STARTED.md) - Quick start for new users
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

### Architecture & Design

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Data Model](docs/DATA-MODEL.md) - TypeScript interfaces and schemas
- [Security Model](docs/SECURITY.md) - E2EE encryption and key management
- [Sync Protocol](docs/SYNC-PROTOCOL.md) - P2P synchronization with Yjs

### Development

- [API Reference](docs/API.md) - IPC channels and service APIs
- [Testing Guide](docs/TESTING.md) - Testing guidelines and best practices
- [Design System](docs/DESIGN-SYSTEM.md) - UI components and styling
- [Performance](docs/PERFORMANCE.md) - Performance optimization guide
- [Environment Variables](docs/ENVIRONMENT-VARIABLES.md) - Configuration options
- [Contributing](CONTRIBUTING.md) - How to contribute

### Reference

- [Changelog](docs/CHANGELOG.md) - Version history
- [Status](docs/STATUS.md) - Current module status

---

## Security

DOFTool is designed with privacy as a core principle:

- **End-to-End Encryption**: All data encrypted with XChaCha20-Poly1305
- **Zero Knowledge**: No server can read your data
- **Local-First**: Data stays on your devices
- **Open Source**: Audit the code yourself

### Reporting Security Issues

Please report security vulnerabilities privately via [GitHub Security Advisories](https://github.com/asterixix/DOFTool/security/advisories/new) or email **artur@sendyka.dev**. Do not open public issues for security concerns.

See [SECURITY.md](SECURITY.md) for our vulnerability disclosure policy and [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

---

## FAQ

### How does sync work without a server?

DOFTool uses **mDNS** (Multicast DNS) to discover other family devices on your local network. Once discovered, devices connect directly via **WebRTC** and exchange data using **Yjs CRDTs** which automatically resolve conflicts.

### What happens if I'm offline?

Everything works offline! Changes are stored locally and sync automatically when you reconnect to your family network.

### Can I use it without other family members?

Yes! DOFTool works great as a personal organizer too. The sync features are optional.

### Is my data backed up?

Data is stored on each synced device. For additional backup, you can export calendars (iCal) and tasks (JSON) from the app.

### Can family members on different networks sync?

Currently, sync requires devices to be on the same local network. Cloud relay support for remote sync is planned for a future release.

---

## Roadmap

### Completed

- [x] Calendar with recurrence support
- [x] Task management with lists and priorities
- [x] End-to-end encryption (XChaCha20-Poly1305)
- [x] Local P2P sync via mDNS/WebRTC
- [x] Family management with roles
- [x] Yjs CRDT-based conflict resolution

### In Progress

- [ ] Email client (IMAP/SMTP) - _currently being rebuilt_
- [ ] External calendar sync (CalDAV)

### Planned

- [ ] Mobile apps (React Native)
- [ ] Cloud relay for remote sync
- [ ] Calendar/task sharing links
- [ ] Plugin system
- [ ] Multi-language support

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

### Ways to Contribute

- **Report bugs** - Open an issue with reproduction steps
- **Suggest features** - Discuss ideas in GitHub Discussions
- **Improve documentation** - Fix typos or clarify explanations
- **Submit pull requests** - Follow our coding standards
- **Help with translations** - Internationalization coming soon

---

## License

DOFTool is open source software licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [Anytype](https://github.com/anyproto/anytype-ts) - Inspiration for local-first architecture
- [Yjs](https://github.com/yjs/yjs) - CRDT implementation
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Electron](https://www.electronjs.org/) - Desktop framework
- [libsodium](https://github.com/jedisct1/libsodium) - Cryptography library

---

## Contact

- **Author**: Artur Sendyka
- **Website**: [sendyka.dev](https://sendyka.dev)
- **GitHub**: [github.com/asterixix/DOFTool](https://github.com/asterixix/DOFTool)
- **Email**: artur@sendyka.dev
