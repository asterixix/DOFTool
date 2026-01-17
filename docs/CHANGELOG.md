# Changelog

All notable changes to DOFTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Documentation overhaul with comprehensive guides
- New `docs/README.md` documentation index
- `docs/GETTING-STARTED.md` user guide
- `docs/API.md` IPC API reference
- `docs/TESTING.md` testing guidelines
- `docs/TROUBLESHOOTING.md` common issues guide

### Changed

- Renamed internal references from "FamilySync" to "DOFTool"

### Fixed

- Naming consistency across documentation

---

## [0.1.0] - 2025-01-XX

### Added

#### Core

- Initial release of DOFTool
- Electron 33+ desktop application
- React 19 + TypeScript 5.5+ frontend
- Vite build system
- End-to-end encryption with XChaCha20-Poly1305
- P2P sync via mDNS discovery and WebRTC
- Yjs CRDT-based conflict resolution
- LevelDB local storage with y-leveldb persistence

#### Family Management

- Create family with encryption passphrase
- Invite members via QR code or token
- Role-based permissions (Admin, Parent, Child, Guest)
- Device management with per-device access controls
- Member profile management

#### Calendar

- Multiple calendars with custom colors
- Event creation with title, description, location
- All-day and timed events
- Recurring events (daily, weekly, monthly, yearly)
- Event reminders with system notifications
- iCal import/export
- Per-calendar and per-event sharing permissions
- Month, week, and day views

#### Tasks

- Multiple task lists with custom colors
- Task creation with priorities (None, Low, Medium, High, Urgent)
- Due dates and time
- Task assignment to family members
- Subtasks and checklists
- Labels/tags
- List view and Kanban board view
- JSON import/export

#### Sync

- Automatic P2P discovery on local network
- Real-time sync between devices
- Offline-first operation
- Conflict-free merging with CRDTs
- Sync status indicators
- Force sync option

#### UI/UX

- shadcn/ui component library
- Tailwind CSS 4 styling
- Framer Motion animations
- Dark/Light/System theme support
- Responsive design (mobile and desktop)
- Keyboard shortcuts

#### Security

- Zero-knowledge architecture
- Argon2id key derivation
- Ed25519 digital signatures
- X25519 key exchange
- Secure device authentication
- Encrypted data at rest

### Known Issues

- Email module temporarily disabled for rebuilding
- Cloud relay for remote sync not yet implemented
- Mobile apps not yet available

---

## Version History

### Versioning Scheme

DOFTool uses Semantic Versioning:

- **MAJOR** (X.0.0): Breaking changes, data migration required
- **MINOR** (0.X.0): New features, backwards compatible
- **PATCH** (0.0.X): Bug fixes, backwards compatible

### Pre-release Versions

- **alpha**: Early development, unstable
- **beta**: Feature complete, testing phase
- **rc**: Release candidate, final testing

Example: `0.2.0-beta.1`

---

## Upgrade Notes

### Upgrading from 0.1.x to 0.2.x

_(Future upgrade notes will be documented here)_

---

## Links

- [GitHub Releases](https://github.com/asterixix/DOFTool/releases)
- [GitHub Commits](https://github.com/asterixix/DOFTool/commits/main)
- [Migration Guides](MIGRATIONS.md) _(coming soon)_

---

## Contributors

See [GitHub Contributors](https://github.com/asterixix/DOFTool/graphs/contributors) for the full list.

---

_This changelog is maintained manually. For detailed commit history, see the [Git log](https://github.com/asterixix/DOFTool/commits/main)._
