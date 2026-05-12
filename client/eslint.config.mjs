import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "coverage/**"]
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
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser }
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: config.files ?? ["**/*.{ts,tsx}"]
  })),
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
  {
    files: [
      "**/*.test.{js,jsx}",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{js,jsx}",
      "**/*.spec.{ts,tsx}",
      "**/__tests__/**/*.{js,jsx}",
      "**/__tests__/**/*.{ts,tsx}"
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
    files: ["vite.config.js", "vite.config.ts", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: "module"
    }
  }

]);
