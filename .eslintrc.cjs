// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    es2023: true,
    browser: true,
    node: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // If you want type-aware lint rules later, uncomment and point to your tsconfig:
    // project: ["./tsconfig.json"],
  },
  plugins: [
    "@typescript-eslint",
    "import",
    "unused-imports",
    "prettier"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier" // keep this last to disable stylistic rules ESLint might conflict with Prettier
  ],
  rules: {
    // === Key recommendations from our discussion ===
    "semi": ["error", "always"],
    "no-unexpected-multiline": "error",

    // General quality
    "eqeqeq": ["error", "smart"],
    "curly": ["error", "all"],
    "no-var": "error",
    "prefer-const": "error",

    // TypeScript
    "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],

    // Imports
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
      "newlines-between": "always",
      "alphabetize": { order: "asc", caseInsensitive: true }
    }],
    "import/no-unresolved": "off", // TS handles this; enable if you’re not using TS path mapping

    // Unused imports/vars
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],

    // Prettier (formatting)
    "prettier/prettier": "error"
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        // Add TS-specific tweaks here if needed
      }
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      env: { jest: true },
      rules: {
        // Unit tests - no testing-library allowed
        "@typescript-eslint/no-explicit-any": "off",
        "no-restricted-imports": ["error", {
          "patterns": [
            {
              "group": ["@testing-library/*"],
              "message": "Testing library can only be used in integration tests (.spec.ts files). Unit tests (.test.ts) should test pure logic without DOM dependencies."
            }
          ]
        }]
      }
    },
    {
      files: ["**/*.spec.ts", "**/*.spec.tsx"],
      env: { jest: true },
      rules: {
        // Integration tests - testing-library allowed
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      files: ["**/*.e2e.ts"],
      env: { jest: true, node: true },
      rules: {
        // E2E tests - Playwright specific rules
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      files: ["*.config.{js,cjs,mjs,ts}"],
      env: { node: true }
    }
  ],
  ignorePatterns: [
    "dist/",
    "build/",
    "coverage/",
    "node_modules/",
    ".vite/",
    ".next/",
    "*.d.ts"
  ]
};
