const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "packages/trpc/server");
const targetDir = path.resolve(rootDir, "../ecom-shared-packages/packages/trpc-types/src/server");
const stubFile = path.resolve(rootDir, "../ecom-shared-packages/packages/trpc-types/stubs/index.d.ts");

console.log("📋 1. Scanning @ecom/features and @ecom/prisma imports to generate type stubs...");

const reservedWords = new Set([
  "default", "delete", "enum", "null", "undefined", "class", "function", "void",
  "return", "catch", "try", "if", "else", "for", "while", "do", "in", "instanceof",
  "typeof", "new", "this", "super", "import", "export", "var", "let", "const",
  "interface", "type", "namespace", "abstract", "as", "is", "keyof", "readonly",
  "map", "filter", "find", "forEach", "reduce", "then", "catch", "json", "status",
  "log", "error", "Prisma", "true", "false"
]);

const exportedSymbols = new Set([
  "prisma", "buildPrismaWhere", "FilterFieldConfigMap", "registerEventListeners",
  "getTree", "getDetail", "search", "getCountries", "getTransportModes", "calculate"
]);

const prismaTypes = new Set([
  "InputJsonValue", "JsonValue", "Decimal", "SortOrder", "TransactionClient"
]);

function scanImports(dir) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanImports(fullPath);
    } else if (item.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      
      // Namespace imports: import * as A from "@ecom/..."
      const nsMatches = content.matchAll(/import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+["']@ecom\/(?:features|prisma)[^"']*["']/gs);
      for (const m of nsMatches) {
        if (!reservedWords.has(m[1])) exportedSymbols.add(m[1]);
      }

      // Method calls on imported namespace objects
      const methodMatches = content.matchAll(/([A-Za-z0-9_$]+)\.([A-Za-z0-9_$]+)\s*\(/g);
      for (const m of methodMatches) {
        if (!reservedWords.has(m[2])) exportedSymbols.add(m[2]);
      }

      // Static imports: import { A, B } from "@ecom/..." (multiline safe)
      const staticMatches = content.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']@ecom\/(?:features|prisma)[^"']*["']/gs);
      for (const m of staticMatches) {
        const symbols = m[1].split(",")
          .map(s => s.trim().split(/\s+as\s+/)[0].split(":")[0].trim().replace(/^type\s+/, ""))
          .filter(s => Boolean(s) && /^[A-Za-z0-9_$]+$/.test(s) && !reservedWords.has(s));
        symbols.forEach(s => exportedSymbols.add(s));
      }

      // Dynamic imports: const { A, B } = await import("@ecom/...") (multiline safe)
      const dynamicMatches = content.matchAll(/(?:const|let|var)\s+\{([^}]+)\}\s*=\s*(?:await\s+)?import\s*\(\s*["']@ecom\/(?:features|prisma)[^"']*["']\s*\)/gs);
      for (const m of dynamicMatches) {
        const symbols = m[1].split(",")
          .map(s => s.trim().split(/\s+as\s+/)[0].split(":")[0].trim().replace(/^type\s+/, ""))
          .filter(s => Boolean(s) && /^[A-Za-z0-9_$]+$/.test(s) && !reservedWords.has(s));
        symbols.forEach(s => exportedSymbols.add(s));
      }

      // Prisma.X usage scanning
      const prismaMatches = content.matchAll(/Prisma\.([A-Za-z0-9_]+)/g);
      for (const m of prismaMatches) {
        if (!reservedWords.has(m[1])) prismaTypes.add(m[1]);
      }
    }
  }
}

scanImports(srcDir);

let stubContent = `// Auto-generated type stubs for backend feature containers\n`;
stubContent += `declare const _stub: any;\nexport default _stub;\n`;
for (const sym of Array.from(exportedSymbols).sort()) {
  stubContent += `export declare const ${sym}: any;\nexport type ${sym} = any;\n`;
}

stubContent += `\nexport namespace Prisma {\n`;
for (const pt of Array.from(prismaTypes).sort()) {
  stubContent += `  export type ${pt} = any;\n  export declare const ${pt}: any;\n`;
}
stubContent += `}\nexport declare const Prisma: any;\n`;

fs.mkdirSync(path.dirname(stubFile), { recursive: true });
fs.writeFileSync(stubFile, stubContent, "utf-8");
console.log(`✅ Generated ${exportedSymbols.size} feature stubs and ${prismaTypes.size} Prisma namespace stubs in ecom-shared-packages/packages/trpc-types/stubs/index.d.ts`);

console.log("📋 2. Syncing self-contained tRPC router types to ecom-shared-packages...");
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.mkdirSync(targetDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const childItemName of fs.readdirSync(src)) {
      if (childItemName.endsWith(".d.ts") || childItemName.endsWith(".map")) continue;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    }
  } else {
    if (!src.endsWith(".d.ts") && !src.endsWith(".map")) {
      let content = fs.readFileSync(src, "utf-8");
      
      // Strip backend runtime event listeners in init.ts
      if (src.endsWith("init.ts")) {
        content = content
          .replace(/import\s*\{\s*registerEventListeners\s*\}\s*from\s*"@ecom\/features\/events\/listeners";/g, "// Omitted backend event listeners for client types")
          .replace(/registerEventListeners\(\);/g, "// Omitted registerEventListeners for client types");
      }
      
      // Strip backend policy runtime imports in requirePolicy.ts
      if (src.endsWith("requirePolicy.ts")) {
        content = content
          .replace(/import\s*\{\s*PostPolicy\s*\}\s*from\s*"@ecom\/features\/blog\/policies\/PostPolicy";/g, "const PostPolicy: any = {};")
          .replace(/import\s*\{\s*getPostService\s*\}\s*from\s*"@ecom\/features\/di\/containers\/BlogService";/g, "const getPostService = () => ({}) as any;");
      }

      fs.writeFileSync(dest, content, "utf-8");
    }
  }
}

copyRecursiveSync(srcDir, targetDir);
console.log("✅ Successfully synced self-contained tRPC router types into ecom-shared-packages!");
