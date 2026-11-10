/**
 * `check-list-pages.mjs` 的类型声明。
 *
 * 目标仓库 tsconfig `allowJs: false`，`.mjs` 不会被类型检查，
 * 这里补一份声明让 TS / 编辑器能正确推断 `checkListSource` 的签名。
 */
export function checkListSource(source: string, filename: string): string[];
