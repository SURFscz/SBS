import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "coverage/**", "build/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: {
      js ,
      'react-hooks': reactHooks
    },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser }
  },
  pluginReact.configs.flat.recommended, // React config first
  reactHooks.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "18.3"
      }
    },
    rules: {
      "react/prop-types": "off",
      "react/no-children-prop": "off",
      'react-hooks/exhaustive-deps': 'warn',
      "react/react-in-jsx-scope" : "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability":"off"
    },
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.{ts,tsx}"]
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true }
      },
      globals: globals.browser
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  {
    files: [
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
      "**/__tests__/**/*.{js,jsx,ts,tsx}"
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    }
  }
  ,
  {
    files: [".eslintrc.js", "src/setupProxy.js"],
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: "commonjs"
    }
  },
  {
    files: ["vite.config.js", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: "module"
    }
  }

]);
