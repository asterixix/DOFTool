import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';

// Note: For Linux AppImage support, install: npm install --save-dev @reforged/maker-appimage
// Then uncomment the AppImage maker below

const config: ForgeConfig = {
  packagerConfig: {
    name: 'DOFTool',
    executableName: 'doftool',
    appBundleId: 'app.doftool.desktop',
    appCopyright: 'Copyright © 2024 Artur Sendyka',
    appCategoryType: 'public.app-category.productivity',
    // ASAR archive for faster loading and hiding source code
    asar: {
      // Unpack native modules that can't run from ASAR
      unpack: '*.{node,dll,so,dylib}',
      // Unpack patterns for modules that need filesystem access
      unpackDir: '{node_modules/level,node_modules/y-leveldb,node_modules/libsodium-wrappers}',
    },
    icon: path.resolve(__dirname, 'public/icon'),
    // Disable code signing - no certificates available
    osxSign: undefined,
    osxNotarize: undefined,
    // Extra resources
    extraResource: [
      path.resolve(__dirname, 'public/icon.ico'),
      path.resolve(__dirname, 'public/icon.icns'),
    ],
    // macOS specific
    extendInfo: {
      NSHumanReadableCopyright: 'Copyright © 2024 Artur Sendyka',
      CFBundleShortVersionString: '1.0.1',
      LSApplicationCategoryType: 'public.app-category.productivity',
      NSLocalNetworkUsageDescription:
        'DOFTool uses local network to sync data between family devices.',
      NSBonjourServices: ['_doftool._tcp'],
    },
    // Comprehensive ignore patterns for optimized packaging
    // Only include dist/ and necessary node_modules
    ignore: [
      // Source and development directories
      /^\/src\//,
      /^\/tests\//,
      /^\/scripts\//,
      /^\/docs\//,
      /^\/electron\/.*\.ts$/, // Exclude TypeScript source, keep compiled JS
      /^\/\.github\//,
      /^\/\.vscode\//,
      /^\/\.cursor\//,
      /^\/\.husky\//,
      /^\/\.git\//,
      /^\/build\//,
      /^\/playwright-report\//,
      /^\/coverage\//,

      // Config files not needed at runtime
      /^\/(tsconfig|vite\.config|vitest\.config|playwright\.config|postcss\.config|tailwind\.config|forge\.config|commitlint\.config|components\.json)/,
      /^\/\.eslint/,
      /^\/\.prettier/,
      /^\/\.gitignore$/,

      // Documentation and metadata
      /\.md$/,
      /\.txt$/,
      /LICENSE$/,
      /CHANGELOG$/,
      /CONTRIBUTING$/,
      /CODE_OF_CONDUCT$/,
      /SECURITY$/,

      // Source maps and TypeScript artifacts
      /\.map$/,
      /\.d\.ts$/,
      /\.tsbuildinfo$/,

      // Test files
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /__tests__/,
      /__mocks__/,

      // Development dependencies in node_modules
      /node_modules\/\.cache/,
      /node_modules\/@types\//,
      /node_modules\/typescript\//,
      /node_modules\/eslint/,
      /node_modules\/prettier/,
      /node_modules\/vitest/,
      /node_modules\/@vitest\//,
      /node_modules\/@playwright\//,
      /node_modules\/@testing-library\//,
      /node_modules\/jsdom/,
      /node_modules\/husky/,
      /node_modules\/lint-staged/,
      /node_modules\/@commitlint\//,
      /node_modules\/@electron-forge\//,
      /node_modules\/@electron\/fuses\//,
      /node_modules\/electron$/,
      /node_modules\/vite/,
      /node_modules\/@vitejs\//,
      /node_modules\/tailwindcss$/,
      /node_modules\/autoprefixer/,
      /node_modules\/postcss$/,

      // Unnecessary files in node_modules
      /node_modules\/.*\/README/i,
      /node_modules\/.*\/CHANGELOG/i,
      /node_modules\/.*\/LICENSE/i,
      /node_modules\/.*\/\.github\//,
      /node_modules\/.*\/docs?\//,
      /node_modules\/.*\/test\//,
      /node_modules\/.*\/tests\//,
      /node_modules\/.*\/examples?\//,
      /node_modules\/.*\/\.eslint/,
      /node_modules\/.*\/\.prettier/,
    ],
  },
  rebuildConfig: {
    force: false,
    onlyModules: [],
  },
  makers: [
    // ============================================
    // WINDOWS MAKERS
    // ============================================

    // Windows - Squirrel.Windows (exe installer with auto-update support)
    new MakerSquirrel({
      name: 'DOFTool',
      // App metadata
      title: 'DOFTool - Family Collaboration',
      authors: 'Artur Sendyka',
      description:
        'Decentralized, offline-first, end-to-end encrypted family collaboration for Calendar, Tasks, and Email with P2P synchronization.',
      // Icons
      setupIcon: path.resolve(__dirname, 'public/icon.ico'),
      iconUrl: 'https://raw.githubusercontent.com/asterixix/DOFTool/main/public/icon.ico',
      // Custom loading animation during installation
      loadingGif: path.resolve(__dirname, 'public/installer-loading.gif'),
      // Installer options
      noMsi: false, // Also generate MSI installer
      setupExe: 'DOFTool-Setup.exe',
      // Code signing (uncomment when certificate is available)
      // certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
      // certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
    }),

    // Windows - ZIP (portable version, no installation required)
    new MakerZIP({}, ['win32']),

    // ============================================
    // MACOS MAKERS
    // ============================================

    // macOS - DMG (disk image for distribution)
    new MakerDMG({
      icon: path.resolve(__dirname, 'public/icon.icns'),
      format: 'ULFO', // ULFO = lzfse compression (best for modern macOS)
      name: 'DOFTool',
      overwrite: true,
      contents: [
        {
          x: 130,
          y: 220,
          type: 'file',
          path: '', // Will be filled by Forge with the app path
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications',
        },
      ],
      additionalDMGOptions: {
        window: {
          size: {
            width: 540,
            height: 380,
          },
        },
      },
    }),

    // macOS - ZIP (for auto-updates via electron-updater)
    new MakerZIP(
      {
        // macUpdateManifestBaseUrl is used for Squirrel.Mac auto-updates
        // electron-updater uses GitHub releases directly, so this is optional
      },
      ['darwin']
    ),

    // ============================================
    // LINUX MAKERS
    // ============================================

    // Linux - Debian/Ubuntu package (.deb)
    new MakerDeb({
      options: {
        name: 'doftool',
        productName: 'DOFTool',
        genericName: 'Family Collaboration Tool',
        description:
          'Decentralized, offline-first, end-to-end encrypted family collaboration for Calendar, Tasks, and Email with P2P synchronization.',
        maintainer: 'Artur Sendyka <artur@sendyka.dev>',
        homepage: 'https://sendyka.dev',
        icon: path.resolve(__dirname, 'public/icon.png'),
        categories: ['Office', 'Utility', 'System'],
        section: 'utils',
        priority: 'optional',
        // Runtime dependencies
        depends: ['libnotify4', 'libsecret-1-0', 'libgtk-3-0', 'libnss3'],
        mimeType: ['x-scheme-handler/doftool'],
      },
    }),

    // Linux - RPM package (Fedora/RHEL/CentOS)
    new MakerRpm({
      options: {
        name: 'doftool',
        productName: 'DOFTool',
        genericName: 'Family Collaboration Tool',
        description:
          'Decentralized, offline-first, end-to-end encrypted family collaboration for Calendar, Tasks, and Email with P2P synchronization.',
        license: 'MIT',
        homepage: 'https://sendyka.dev',
        icon: path.resolve(__dirname, 'public/icon.png'),
        categories: ['Office', 'Utility', 'System'],
        // Runtime dependencies
        requires: ['libnotify', 'libsecret', 'gtk3', 'nss'],
      },
    }),

    // Linux - ZIP (portable, for AppImage alternative or manual installation)
    new MakerZIP({}, ['linux']),

    // Linux - AppImage (universal Linux package)
    // Uncomment after installing: npm install --save-dev @reforged/maker-appimage
    // new MakerAppImage({
    //   options: {
    //     name: 'DOFTool',
    //     icon: path.resolve(__dirname, 'public/icon.png'),
    //     categories: ['Office', 'Calendar', 'ProjectManagement', 'Email'],
    //   },
    // }),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'asterixix',
        name: 'DOFTool',
      },
      prerelease: false,
      draft: true,
      generateReleaseNotes: true,
    }),
  ],
  plugins: [
    // Auto-unpack native modules from ASAR
    new AutoUnpackNativesPlugin({}),
    // Security fuses
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    // Pre-package hook - build the renderer and electron code
    generateAssets: async () => {
      // Build is handled by npm scripts before forge:make
      console.log('[Forge] Assets generated');
    },
    postMake: async (_config: ForgeConfig, makeResults: any[]) => {
      console.log('[Forge] Make completed');
      for (const result of makeResults) {
        console.log(`[Forge] Platform: ${result.platform}, Arch: ${result.arch}`);
        for (const artifact of result.artifacts) {
          console.log(`[Forge]   - ${artifact}`);
        }
      }
      return makeResults;
    },
  },
};

export default config;
