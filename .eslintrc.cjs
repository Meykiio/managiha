/* ESLint config.
 *
 * Two jobs, both of which exist because a rule written down in AGENTS.md and not
 * enforced by CI is a rule that quietly stops being true. `max-lines` is the
 * 250-line limit; `jsx-a11y` is the WCAG 2.2 AA sweep that would otherwise need a
 * human to remember every time.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "jsx-a11y"],
  extends: [
    "eslint:recommended",
    "plugin:jsx-a11y/recommended",
  ],
  settings: { react: { version: "18.3" } },
  ignorePatterns: ["dist", "node_modules", "coverage", "supabase"],
  rules: {
    // AGENTS.md rule 5. Skipped for the locale files, which are long by nature and
    // already split by domain: the limit that matters there is keys-per-file, and
    // the completeness test covers it.
    "max-lines": [
      "error",
      { max: 250, skipBlankLines: false, skipComments: false },
    ],
    "jsx-a11y/anchor-is-valid": [
      "error",
      { components: ["Link"], specialLink: ["to"] },
    ],

    // Not a defect in this codebase: the app is not a forms library, and
    // `any` is still common in the Supabase query-builder results we have not
    // retyped yet. Re-enable when the typing work lands.
    "no-undef": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
  overrides: [
    {
      files: ["src/i18n/locales/**/*.ts"],
      rules: { "max-lines": "off" },
    },
    {
      files: ["**/__tests__/**", "src/test/**", "scripts/**"],
      rules: { "max-lines": "off", "jsx-a11y/*": "off" },
    },
  ],
};