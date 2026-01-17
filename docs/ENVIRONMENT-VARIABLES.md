# Environment Variables in Electron Build

## Overview

This document explains how environment variables are handled in the DOFTool Electron application build process.

## Vite Environment Variables (`VITE_*`)

### How They Work

- **Vite** replaces `import.meta.env.VITE_*` variables at **build time**
- These values are **embedded directly** into the JavaScript bundle
- They are **publicly visible** in the built application code
- Use `import.meta.env.VITE_*` (NOT `process.env.VITE_*`) in renderer code

### Examples

```typescript
// ✅ CORRECT - Uses import.meta.env
const APTABASE_KEY = import.meta.env.VITE_APTABASE_APP_KEY;

// ❌ WRONG - process.env doesn't work in renderer with Vite
const APTABASE_KEY = process.env.VITE_APTABASE_APP_KEY;
```

### Setting Variables

**Development:**

```bash
# Create .env file (already in .gitignore)
VITE_APTABASE_APP_KEY=A-US-xxxxxx
VITE_APP_VERSION=0.1.0
```

**Production Build:**

```bash
VITE_APTABASE_APP_KEY=A-US-xxxxxx npm run build
```

### Security Implications

- ✅ **Safe to embed**: Public API keys, app keys, non-sensitive configuration
  - Example: `VITE_APTABASE_APP_KEY` (Aptabase App Keys are meant to be public)
- ❌ **NOT safe to embed**: Secrets, tokens, private keys, passwords
  - Example: GitHub Personal Access Tokens, API secrets

---

## Node.js Environment Variables (Main Process)

### How They Work

- Main process (Electron `main.ts`) uses Node.js `process.env`
- These are **NOT embedded** in the bundle
- Only available at **runtime** on the machine running the app
- Set via system environment or `.env` files (with dotenv if needed)

### Examples

```typescript
// In electron/main.ts or electron/services/*
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // ✅ Safe - not in bundle
```

### Setting Variables

**Development:**

```bash
# PowerShell (Windows)
$env:GITHUB_TOKEN="ghp_xxxxx"; npm run dev

# Bash/Linux/Mac
GITHUB_TOKEN=ghp_xxxxx npm run dev
```

**Production:**
Set as system environment variable or configure in CI/CD:

```bash
GITHUB_TOKEN=ghp_xxxxx npm run build
```

---

## Current Implementation

### Analytics (Aptabase) - ✅ Safe to Embed

**File:** `src/shared/services/analytics.ts`

```typescript
// Uses VITE_ prefix - embedded at build time
const APTABASE_APP_KEY = import.meta.env.VITE_APTABASE_APP_KEY ?? 'A-US-XXXXXX';
```

**Why Safe:**

- Aptabase App Keys are designed to be public (client-side)
- They're scoped to your app and have rate limits
- Similar to Google Analytics tracking IDs

**Setup:**

1. Get your App Key from [Aptabase Dashboard](https://aptabase.com)
2. Set in `.env` file: `VITE_APTABASE_APP_KEY=A-US-xxxxxx`
3. Rebuild the app: `npm run build`

### Crash Reporting (GitHub) - ✅ Secure (Not in Bundle)

**Renderer:** `src/shared/services/crashReporting.ts`  
**Main Process:** `electron/services/CrashReportingService.ts`

**Architecture:**

```
Renderer Process → IPC → Main Process → GitHub API
                      ↑
              GITHUB_TOKEN (runtime env var, not in bundle)
```

**Why Secure:**

- GitHub token is only read in main process (Node.js `process.env`)
- Token is **NOT** in the renderer bundle
- Users cannot extract it from the built app

**Setup:**

1. Create GitHub Personal Access Token with `repo` scope
2. Set as system environment variable: `GITHUB_TOKEN=ghp_xxxxx`
3. The token is only used server-side (main process), not in the bundle

---

## Best Practices

### ✅ DO

1. **Public keys/app keys**: Use `VITE_*` prefix and `import.meta.env`
2. **Sensitive tokens**: Use Node.js `process.env` in main process only
3. **Configuration**: Use `VITE_*` for app configuration that should be in bundle
4. **Version info**: Use `VITE_APP_VERSION` for build-time versioning

### ❌ DON'T

1. **Never** put secrets in `VITE_*` variables
2. **Never** use `process.env.VITE_*` in renderer (won't work)
3. **Never** commit `.env` files with secrets to git
4. **Never** hardcode tokens or keys in source code

---

## File Locations

- **Renderer env vars**: `src/**/*.ts` → Use `import.meta.env.VITE_*`
- **Main process env vars**: `electron/**/*.ts` → Use `process.env.*`
- **Environment files**: `.env`, `.env.local`, `.env.production` (gitignored)

---

## Summary Table

| Variable Type   | Prefix   | Access Method            | Embedded in Bundle? | Safe for Secrets? |
| --------------- | -------- | ------------------------ | ------------------- | ----------------- |
| Vite (Renderer) | `VITE_*` | `import.meta.env.VITE_*` | ✅ Yes              | ❌ No             |
| Node.js (Main)  | Any      | `process.env.*`          | ❌ No               | ✅ Yes            |

---

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Aptabase Documentation](https://aptabase.com/docs)
