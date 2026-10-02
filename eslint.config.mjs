import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";

export default ts.config(
  { ignores: ["**/dist/**", "**/generated.ts", "**/node_modules/**"] },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...ts.configs.recommended],
    plugins: { "react-hooks": hooks, "react-refresh": refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);
