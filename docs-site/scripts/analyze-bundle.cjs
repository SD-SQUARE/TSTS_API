const fs = require('fs');
const path = require('path');

const bundle = fs.readFileSync(
  path.join(__dirname, '..', 'build', '__server', 'server.bundle.js'),
  'utf8'
);

// Find all require("@...") calls
const requirePattern = /require\("(@[^"]+)"\)/g;
const found = new Set();
let m;
while ((m = requirePattern.exec(bundle)) !== null) {
  found.add(m[1]);
}

const sorted = [...found].sort();
console.log('All @ requires in server bundle:');
sorted.forEach(r => console.log(' ', r));
