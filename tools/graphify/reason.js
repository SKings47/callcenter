#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const featureName = process.argv[2];
if (!featureName) {
  console.error("Usage: node reason.js <feature-name>");
  process.exit(1);
}

const templatePath = path.join(__dirname, "templates", "analysis.md");
let template = fs.readFileSync(templatePath, "utf-8");
template = template.replace(/\{\{FEATURE\}\}/g, featureName);

const slug = featureName.toLowerCase().replace(/\s+/g, "-");
const outPath = path.join(process.cwd(), `graphify-${slug}.md`);
fs.writeFileSync(outPath, template);
console.log(`\n  Graphify analysis written to: ${outPath}\n`);
