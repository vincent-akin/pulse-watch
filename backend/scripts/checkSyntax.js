// Recursively runs `node --check` on every .js file under src/ to catch syntax errors quickly (no DB/Redis needed).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..', 'src');
let fileCount = 0;
let failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) {
      fileCount += 1;
      try {
        execSync(`node --check "${full}"`, { stdio: 'pipe' });
      } catch (err) {
        failures.push({ file: full, error: err.stderr.toString() });
      }
    }
  }
}

walk(root);

if (failures.length) {
  console.error(`❌ ${failures.length}/${fileCount} files failed syntax check:\n`);
  failures.forEach((f) => console.error(`--- ${f.file} ---\n${f.error}`));
  process.exit(1);
} else {
  console.log(`✅ All ${fileCount} files passed syntax check.`);
}
