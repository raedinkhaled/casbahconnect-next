import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const requireDependency = createRequire(import.meta.url);

// Exercise the actual TypeScript modules while replacing external services.
// No database connection, SMTP delivery, or application secret is used.
export function sourceLoader(mocks = {}) {
  const modules = new Map();
  function load(relativePath) {
    const resolved = path.resolve(root, relativePath);
    const filename = [resolved, `${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, "index.ts")]
      .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    assert.ok(filename, `Cannot resolve source module: ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiledModule = { exports: {} };
    modules.set(filename, compiledModule);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    const localRequire = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith("@/")) return load(specifier.slice(2));
      if (specifier.startsWith(".")) {
        return load(path.resolve(path.dirname(filename), specifier));
      }
      return requireDependency(specifier);
    };
    compileFunction(outputText, ["require", "module", "exports"], { filename })(
      localRequire, compiledModule, compiledModule.exports,
    );
    return compiledModule.exports;
  }
  return load;
}
