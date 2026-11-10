/** Chữ thường, bỏ dấu tiếng Việt (đ → d) để so khớp tìm kiếm không phân biệt dấu. */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLocaleLowerCase('vi');
}
