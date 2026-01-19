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
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'DOFTool',
    executableName: 'doftool',
    appBundleId: 'app.doftool.desktop',
    appCopyright: 'Copyright © 2024 Artur Sendyka',
    appCategoryType: 'public.app-category.productivity',
    asar: true,
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
    // Ignore patterns for packaging
    ignore: [
      /^\/src\//,
      /^\/tests\//,
      /^\/scripts\//,
      /^\/docs\//,
      /^\/.github\//,
      /^\/\.vscode\//,
      /^\/node_modules\/\.cache/,
      /\.md$/,
      /\.map$/,
      /tsconfig.*\.json$/,
      /vite\.config\.(ts|js)$/,
      /vitest\.config\.(ts|js)$/,
      /playwright\.config\.(ts|js)$/,
      /eslint/,
      /prettier/,
      /\.husky/,
    ],
  },
  rebuildConfig: {},
  makers: [
    // Windows - Squirrel.Windows (NSIS-style installer)
    new MakerSquirrel({
      name: 'DOFTool',
      // Icon for the generated Setup.exe
      setupIcon: path.resolve(__dirname, 'public/icon.ico'),
      // Icon URL for Control Panel
      iconUrl: 'https://raw.githubusercontent.com/asterixix/DOFTool/main/public/icon.ico',
      // No code signing
      // certificateFile: undefined,
      // certificatePassword: undefined,
    }),
    // macOS - ZIP for auto-updates
    new MakerZIP(
      {
        // macOS auto-update manifest URL (for GitHub releases)
        // This will be used by electron-updater
      },
      ['darwin']
    ),
    // macOS - DMG for distribution
    new MakerDMG({
      icon: path.resolve(__dirname, 'public/icon.icns'),
      format: 'ULFO',
      contents: [
        {
          x: 130,
          y: 220,
          type: 'file',
          path: '',
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
    // Linux - Debian package
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
        categories: ['Office', 'Calendar', 'ProjectManagement', 'Email'],
        section: 'utils',
        priority: 'optional',
        depends: ['libnotify4', 'libsecret-1-0'],
        mimeType: ['x-scheme-handler/doftool'],
      },
    }),
    // Linux - RPM package
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
        categories: ['Office', 'Calendar', 'ProjectManagement', 'Email'],
        requires: ['libnotify', 'libsecret'],
      },
    }),
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
    postMake: async (_config, makeResults) => {
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
