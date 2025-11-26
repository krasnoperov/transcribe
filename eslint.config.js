import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

const sharedRules = {
  '@stylistic/quotes': ['error', 'single'],
  '@stylistic/semi': ['error', 'never'],
  '@stylistic/indent': ['error', 2],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/no-trailing-spaces': ['error', {
    'skipBlankLines': true,
    'ignoreComments': false
  }],
  'no-console': ['error', { allow: ['info', 'error', 'warn', 'log'] }],
  'no-useless-escape': 'off',
  'object-curly-spacing': ['error', 'always'],
  'space-infix-ops': 'error',
  'space-before-function-paren': ['error', 'always'],
  'space-before-blocks': ['error', 'always'],
  'space-in-parens': ['error', 'never'],
  'space-unary-ops': ['error', {
    'words': true,
    'nonwords': false
  }],
  'keyword-spacing': ['error', {
    'before': true,
    'after': true
  }],
  'comma-spacing': ['error', {
    before: false,
    after: true
  }],
  'no-multiple-empty-lines': ['error', {
    'max': 1,
    'maxEOF': 1,
    'maxBOF': 0
  }],
}

export default defineConfig(
  eslint.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      }
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: sharedRules
  },
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        warnOnUnsupportedTypeScriptVersion: false
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      ...sharedRules,
      '@stylistic/type-annotation-spacing': ['error', {
        'before': true,
        'after': true,
        'overrides': {
          'colon': {
            'before': false,
            'after': true
          }
        }
      }],
      '@typescript-eslint/type-annotation-spacing': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'examples/**'],
  }
)
