import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      // Build outputs
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      // Test artifacts
      'tests/reports/**',
      'tests/results/**',
      'tests/e2e/.auth/**',
      'coverage/**',
      // Generated files
      '**/*.min.js',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default eslintConfig;
