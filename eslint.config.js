import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import simpleImportSort from "eslint-plugin-simple-import-sort";


export default [
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
    
    plugins: {
      "simple-import-sort": simpleImportSort,
    },

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

      'no-console': 'warn',

      // Side effects first → env/config ready
      // Built-ins next → clearly not app code
      // External deps → easy to scan dependencies
      // Internal modules last → shows project structure
      // Types separated → no runtime impact confusion
      // Sorted imports
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  }
]