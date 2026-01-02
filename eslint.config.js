import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ],
  },
  // Base JS rules (all files)
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,
  
  // Prettier (disables formatting rules, must be last)
  prettier,


  // Project-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Prefer explicit types only when needed
      '@typescript-eslint/explicit-function-return-type': 'off',

      // TS already handles this better than ESLint
      'no-undef': 'off',

      // Common best practices
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // Clean code
      'no-console': 'warn',
    },
  }
);