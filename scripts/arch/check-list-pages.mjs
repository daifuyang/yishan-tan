#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { listFiles, report } from "./_shared.mjs";

// Non-list routes have explicit purposes; new resource pages are checked by default.
const NON_LIST_ROUTES = new Map([
  ["index.tsx", "Dashboard overview"],
  ["settings.tsx", "System configuration form"],
  ["route.tsx", "Admin layout and authentication"],
  ["portal/templates/$templateId.tsx", "Portal template low-code designer"],
  ["portal/page-designer/$pageId.tsx", "Portal page low-code designer"],
]);
const REQUIRED_PROPS = [
  "filter",
  "filterValues",
  "onFilterSubmit",
  "onFilterReset",
  "toolbarTitle",
  "tableProps",
];

export function checkListSource(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const resourceNames = new Set();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (
      !/^[@~]\/components\/admin\/layout(?:\/resource-page)?$/.test(statement.moduleSpecifier.text)
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      if ((binding.propertyName ?? binding.name).text === "ResourcePage") {
        resourceNames.add(binding.name.text);
      }
    }
  }

  const issues = [];
  let found = false;
  const visit = (node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      resourceNames.has(node.tagName.getText(file))
    ) {
      found = true;
      const attributes = new Map(
        node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attribute) => [attribute.name.getText(file), attribute]),
      );
      for (const name of REQUIRED_PROPS) {
        const attribute = attributes.get(name);
        const value = attribute?.initializer;
        const expression = value && ts.isJsxExpression(value) ? value.expression : undefined;
        if (
          !value ||
          (ts.isStringLiteral(value) && !value.text.trim()) ||
          (expression && /^(null|undefined|false)$/.test(expression.getText(file)))
        ) {
          issues.push(`ResourcePage 必须提供有效的 ${name}（搜索 + 表格规范）`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!found) issues.push("资源列表必须使用公共 ResourcePage，提供搜索区与表格区");
  return issues;
}

async function main() {
  let violations = 0;
  let checked = 0;
  for (const filename of await listFiles("src/routes/admin", [".tsx"])) {
    const relative = path.posix.relative("src/routes/admin", filename.replaceAll("\\", "/"));
    if (NON_LIST_ROUTES.has(relative)) continue;
    const source = await fs.readFile(filename, "utf8");
    for (const issue of checkListSource(source, filename)) {
      report(filename, 1, issue, "check-list-pages");
      violations += 1;
    }
    checked += 1;
  }
  if (violations) {
    console.error(`[check-list-pages] ${violations} violation(s)`);
    process.exitCode = 1;
  } else {
    console.log(`[check-list-pages] OK (${checked} resource lists)`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
