/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'build', // Build system or external dependencies
        'ci', // CI/CD changes
        'chore', // Other changes (maintenance, etc.)
        'revert', // Revert a previous commit
        'release', // Release commits
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'calendar',
        'tasks',
        'email',
        'family',
        'sync',
        'auth',
        'ui',
        'electron',
        'build',
        'deps',
        'config',
        'release',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
