# DOFTool

**Decentralized, offline-first, end-to-end encrypted family collaboration for Calendar, Tasks, and Email.**

DOFTool is a desktop application that helps families stay organized with shared calendars, tasks, and email management. Your data stays private with zero-knowledge encryption and syncs automatically between family devices over your local network.

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

### Email
- Full IMAP/SMTP email client
- Connect Gmail, Outlook, and other providers [soon] 
- Family internal messaging system
- Shared inbox access
- Send-as permissions for family members

### Sync & Privacy
- Offline-first: works without internet
- P2P sync over local WiFi (mDNS discovery)
- Zero-knowledge E2EE (only your family can read data)
- CRDT-based conflict resolution (no data loss)
- No cloud servers required

---

## Screenshots

*Coming soon*

---

## Installation

### Download

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| Windows | [DOFTool-Setup.exe](https://github.com/doftool/doftool/releases/latest) |
| macOS | [DOFTool.dmg](https://github.com/doftool/doftool/releases/latest) |
| Linux | [DOFTool.AppImage](https://github.com/doftool/doftool/releases/latest) |

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
git clone https://github.com/doftool/doftool.git
cd doftool

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron in development mode |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking |

### Project Structure

```
DOFTool/
├── electron/               # Electron main process
│   ├── main.ts
│   ├── preload.ts
│   └── services/          # Core services (crypto, sync, storage)
├── src/                   # React renderer
│   ├── app/               # App shell, routing, providers
│   ├── modules/           # Feature modules
│   │   ├── family/        # Family management
│   │   ├── calendar/      # Calendar feature
│   │   ├── tasks/         # Tasks feature
│   │   └── email/         # Email client
│   └── shared/            # Shared components, hooks, utils
├── tests/                 # Test files
├── docs/                  # Documentation
└── package.json
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

| Category | Technology |
|----------|------------|
| **Runtime** | Electron 33+ |
| **Frontend** | React 19, TypeScript 5.5+ |
| **Build** | Vite |
| **UI** | shadcn/ui, Tailwind CSS 4, Framer Motion |
| **State** | Zustand, React Query |
| **Data** | Yjs (CRDT), LevelDB |
| **Crypto** | libsodium-wrappers |
| **Sync** | y-webrtc, mDNS (bonjour-service) |
| **Email** | imapflow, nodemailer |
| **Calendar** | ical.js, date-fns |
| **Testing** | Vitest, React Testing Library, Playwright |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [Data Model](docs/DATA-MODEL.md) - TypeScript interfaces and schemas
- [Security](docs/SECURITY.md) - E2EE encryption model
- [Sync Protocol](docs/SYNC-PROTOCOL.md) - P2P synchronization
- [Contributing](docs/CONTRIBUTING.md) - Development guidelines

---

## Security

DOFTool is designed with privacy as a core principle:

- **End-to-End Encryption**: All data encrypted with XChaCha20-Poly1305
- **Zero Knowledge**: No server can read your data
- **Local-First**: Data stays on your devices
- **Open Source**: Audit the code yourself

### Reporting Security Issues

Please report security vulnerabilities to **security@doftool.app**. Do not open public issues for security concerns.

See [SECURITY.md](docs/SECURITY.md) for our full security model.

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

- [x] Calendar with recurrence
- [x] Task management
- [x] E2EE encryption
- [x] Local P2P sync
- [ ] Email client (in progress)
- [ ] Mobile apps (React Native)
- [ ] Cloud relay for remote sync
- [ ] Calendar/task sharing links
- [ ] Plugin system

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](docs/CONTRIBUTING.md) before submitting PRs.

### Ways to Contribute

- Report bugs and suggest features
- Improve documentation
- Submit pull requests
- Help with translations

---

## License

DOFTool is open source software licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [Anytype](https://github.com/anyproto/anytype-ts) - Inspiration for local-first architecture
- [Yjs](https://github.com/yjs/yjs) - CRDT implementation
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Electron](https://www.electronjs.org/) - Desktop framework

---

## Contact

- **Website**: [doftool.app](https://doftool.app)
- **GitHub**: [github.com/doftool/doftool](https://github.com/doftool/doftool)
- **Discord**: [discord.gg/doftool](https://discord.gg/doftool)
- **Email**: hello@doftool.app
