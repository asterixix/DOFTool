# Changelog

All notable changes to DOFTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-18

### 🚀 Features

- **Icon Generation**: Added automated icon generation script that converts SVG icons to platform-specific formats (ICNS for macOS, ICO for Windows, PNGs for Linux)
- **Build Process Integration**: Integrated icon generation into all build and release scripts to ensure icons are always up-to-date
- **CI/CD Enhancement**: Added icon generation step to GitHub Actions workflow for automated releases

### 🔧 Improvements

- **Asset Organization**: Moved icon assets and entitlements from `build/` to `public/` directory for better organization and accessibility
- **macOS Build Configuration**: Enhanced macOS build with proper hardened runtime, entitlements, and extended info for better security and compatibility
- **Linux Build Configuration**: Improved Linux packaging with proper desktop entry metadata, dependencies, and distribution-specific settings
- **Code Quality**: Fixed ESLint issues including prefer-nullish-coalescing and console.log warnings

### 🐛 Fixes

- **macOS App Corruption**: Fixed "app is corrupted" issue by adding hardened runtime, proper entitlements, and gatekeeper settings
- **Icon Path References**: Updated all references to use correct paths after moving assets to `public/` directory
- **Tray Icon Loading**: Fixed tray icon paths to use appropriate locations for each platform (public/ for Windows/macOS, build/ for Linux PNGs)

### 📦 Build System

- **Package.json Updates**:
  - Added icon generation to all build scripts (`build:*`, `release:*`)
  - Updated macOS build configuration with security enhancements
  - Enhanced Linux build with proper metadata and dependencies
- **Script Updates**:
  - `generate-icons.js` now uses `public/icon.svg` as source and generates all platform formats
  - Icons are output to appropriate directories for each platform

### 🔒 Security

- **macOS Entitlements**: Added comprehensive entitlements for JIT compilation, network access, and file system permissions
- **Hardened Runtime**: Enabled macOS hardened runtime for better security and App Store compatibility

### 📁 File Structure Changes

```
public/
├── entitlements.mac.plist  (moved from build/)
├── icon.icns              (moved from build/)
├── icon.ico               (moved from build/)
└── icon.svg               (moved from build/)
```

### ⚙️ Technical Details

- **Electron Builder**: Updated configuration for better cross-platform compatibility
- **Icon Generation**: Uses `icon-gen` library with optimized settings for each platform
- **Asset Management**: Improved asset organization and build process reliability

---

## [1.0.0] - 2026-01-18

### 🎉 Initial Release

- **Core Features**: Calendar, Tasks, and Email management with offline-first architecture
- **P2P Synchronization**: End-to-end encrypted sync using Yjs CRDTs and WebRTC
- **Family Collaboration**: Multi-device support with role-based permissions
- **Cross-Platform**: Windows, macOS, and Linux support with native installers
- **Security**: End-to-end encryption using libsodium and Argon2id key derivation
- **Modern Tech Stack**: React 19, TypeScript 5.5+, Electron 33+, Tailwind CSS 4

---

[Unreleased]: https://github.com/doftool/doftool/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/doftool/doftool/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/doftool/doftool/releases/tag/v1.0.0
