import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.expo/**',
      'apps/api/generated/**',
      '**/dist/**',
      '**/coverage/**',
      '**/android/**',
      '**/ios/**',
      '.agents/**',
      '.aws/**',
      '.codex/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
);
