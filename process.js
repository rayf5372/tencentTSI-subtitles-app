// process.js
const fs   = require('fs');
const path = require('path');

// 1) Load the raw TSI output
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'latest_output.json'), 'utf-8')
);

// 2) Keep only the highest-SeVer entry per SeId
function summarize(raw) {
  const byId = raw.reduce((acc, x) => {
    if (!acc[x.SeId] || x.SeVer > acc[x.SeId].SeVer) {
      acc[x.SeId] = x;
    }
    return acc;
  }, {});
  return Object.values(byId).sort((a, b) => a.StartTime - b.StartTime);
}

// 3) Format as alternating lines
function formatPairs(segments) {
  return segments
    .map(seg =>
      `${seg.SourceText.trim()}\n${seg.TargetText.trim()}`
    )
    .join('\n\n');
}

const summary   = summarize(raw);
const formatted = formatPairs(summary);

fs.writeFileSync(
  path.join(__dirname, 'formatted.txt'),
  formatted,
  'utf-8'
);

console.log(`✅ formatted.txt written (${summary.length} segments)`);
