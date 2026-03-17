import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from "eslint/config";

export default defineConfig([
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
  {
    files: [
      "**/*.test.{js,jsx}",
      "**/*.spec.{js,jsx}",
      "**/__tests__/**/*.{js,jsx}"
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
