import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "dist", "csbt-hub-safe");
const excludedNames = new Set(["node_modules", ".next", ".git", ".vercel", "dist"]);
const excludedFiles = new Set([".env", ".env.local", ".env.development", ".env.production", ".env.test"]);

fs.rmSync(outputRoot, { recursive: true, force: true });

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (excludedNames.has(entry.name)) continue;
    if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
    if (entry.name.endsWith(".zip")) continue;
    if (excludedFiles.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

copyDirectory(root, outputRoot);
console.log(`Safe export created at ${outputRoot}`);
