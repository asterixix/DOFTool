/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  ignorePatterns: [
    'dist',
    'release',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'playwright.config.ts',
    'vitest.config.ts',
    'tests/setup.ts',
    '**/*.d.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    'forge.config.ts',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.electron.json'],
    tsconfigRootDir: __dirname,
    noWarnOnMultipleProjects: true,
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './tsconfig.electron.json'],
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],

    // React
    'react/prop-types': 'off',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-curly-brace-presence': [
      'error',
      { props: 'never', children: 'never' },
    ],
    'react/self-closing-comp': 'error',
    'react/jsx-sort-props': [
      'warn',
      {
        callbacksLast: true,
        shorthandFirst: true,
        reservedFirst: true,
      },
    ],

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Import
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
          'type',
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react', 'type'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',
    'import/no-unresolved': 'error',

    // Accessibility
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['to'],
      },
    ],

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
  },
  overrides: [
    // Files with full TypeScript project coverage
    {
      files: ['src/**/*.{ts,tsx}', 'electron/**/*.ts'],
      extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.electron.json'],
        tsconfigRootDir: __dirname,
        noWarnOnMultipleProjects: true,
      },
    },
    // Unit test files (Vitest)
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.spec.ts'],
      env: {
        jest: true,
      },
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: __dirname,
        noWarnOnMultipleProjects: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // E2E test files (Playwright)
    {
      files: ['tests/e2e/**/*.spec.ts'],
      env: {
        node: true,
      },
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: __dirname,
        noWarnOnMultipleProjects: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    // Electron main process
    {
      files: ['electron/**/*.ts'],
      settings: {
        'import/resolver': {
          typescript: {
            project: ['./tsconfig.electron.json'],
            alwaysTryTypes: true,
          },
        },
      },
      rules: {
        'no-console': 'off',
        'import/no-unresolved': [
          'error',
          {
            ignore: ['electron', 'path', 'fs', 'os', 'util', 'crypto'],
          },
        ],
      },
    },
  ],
};
