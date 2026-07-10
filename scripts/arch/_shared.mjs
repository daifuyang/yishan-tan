#!/usr/bin/env node
/**
 * 共享的轻量 AST 扫描器，避免引入 TypeScript compiler。
 * 支持：
 *   - 解析 import { x } from 'mod' / import x from 'mod' / import 'mod'
 *   - 解析 export const/function/class/async
 *   - 提取顶层声明
 * 单文件流式解析，超简单层级，适合做"禁止某些 import"的检查。
 */
import { promises as fs } from "node:fs";

export async function listFiles(dir, exts = [".ts", ".tsx"]) {
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".output" || ent.name === "deploy") continue;
      const p = `${d}/${ent.name}`;
      if (ent.isDirectory()) await walk(p);
      else if (exts.some((e) => ent.name.endsWith(e))) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

export async function readIfExists(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

export function extractImports(source) {
  /** @type {Array<{ raw: string, names: string[], source: string }>} */
  const imports = [];
  const re = /import\s+(?:(?:([\w*\s{},$]+)\s+from\s+)?)(?:from\s+)?['"]([^'"]+)['"]/g;
  let m = re.exec(source);
  while (m !== null) {
    const raw = m[0];
    const namesRaw = m[1] ?? "*";
    const src = m[2];
    const names =
      namesRaw.trim() === "*"
        ? []
        : namesRaw
            .replace(/[{}]/g, "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    imports.push({ raw, names, source: src });
    m = re.exec(source);
  }
  return imports;
}

export function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

export function report(file, line, message, rule) {
  console.error(`${file}:${line} [${rule}] ${message}`);
}

export function isInTestPath(p) {
  return p.includes("/tests/") || p.includes("/scripts/generators/");
}
