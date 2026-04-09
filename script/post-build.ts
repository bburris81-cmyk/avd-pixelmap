/**
 * Post-build: patch the single-file HTML so it works from file:// protocol.
 * - Removes type="module" (not needed with inlined IIFE code)
 * - Moves inline scripts from <head> to end of <body> so #root exists when JS runs
 * - Removes favicon reference (no external files)
 */
import fs from "fs";
import path from "path";

const htmlPath = path.resolve(import.meta.dirname, "..", "dist", "public", "index.html");
let html = fs.readFileSync(htmlPath, "utf-8");

// Remove favicon link (won't resolve from file://)
html = html.replace(/<link rel="icon"[^>]*\/>/g, "");

// Extract inline <script> blocks from <head> and move to end of <body>
const headEnd = html.indexOf("</head>");
const headSection = html.slice(0, headEnd);
const rest = html.slice(headEnd);

const scripts: string[] = [];
const headCleaned = headSection.replace(/<script>[\s\S]*?<\/script>/g, (match) => {
  scripts.push(match);
  return "";
});

const finalHtml = headCleaned + rest.replace("</body>", scripts.join("\n") + "\n</body>");

fs.writeFileSync(htmlPath, finalHtml);
console.log(`post-build: patched index.html (${scripts.length} script(s) moved to body, ${finalHtml.length} bytes)`);
