import { fileURLToPath } from 'node:url';

export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  endOfLine: 'lf',
  // Sắp xếp class Tailwind theo thứ tự chuẩn; đọc token từ CSS của web.
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: fileURLToPath(
    new URL('../../apps/web/src/styles/index.css', import.meta.url),
  ),
  tailwindFunctions: ['cn', 'cva'],
};
