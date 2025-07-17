const fs   = require('fs');
const path = require('path');

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'latest_output.json'), 'utf-8')
);

function summarize(raw) {
  const byId = raw.reduce((acc, x) => {
    if (!acc[x.SeId] || x.SeVer > acc[x.SeId].SeVer) {
      acc[x.SeId] = x;
    }
    return acc;
  }, {});
  return Object.values(byId).sort((a, b) => a.StartTime - b.StartTime);
}

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

console.log(`Successfully formatted.txt written (${summary.length} segments)`);
