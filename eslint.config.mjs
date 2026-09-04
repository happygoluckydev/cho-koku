import { FlatCompat } from "@eslint/eslintrc";

// create-next-app 15 が生成する形式。next/core-web-vitals と next/typescript を
// flat config から読み込むために FlatCompat を使う。
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
