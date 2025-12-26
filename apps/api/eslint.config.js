import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // 1️⃣ Base JS rules
  js.configs.recommended,

  // 2️⃣ TypeScript recommended rules
  ...tseslint.configs.recommended,

  // 3️⃣ Prettier (disables formatting rules)
  prettier,

  // 4️⃣ Project-specific rules
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