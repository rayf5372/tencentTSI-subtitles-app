const fs   = require('fs');
const path = require('path');

const input = process.argv[2] || 'latest_output.json';
if (!fs.existsSync(input)) {
  console.error(`ERROR: ${input} not found.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(input, 'utf-8'));

const arr = Array.isArray(raw)
  ? raw
  : raw.translation
    ? raw.translation
    : raw.segments
      ? raw.segments
      : null;

if (!arr) {
  console.error(`ERROR: no .translation or .segments array found in ${input}`);
  process.exit(1);
}

function summarize(list) {
  const map = {};
  for (const x of list) {
    if (!map[x.SeId] || x.SeVer > map[x.SeId].SeVer) {
      map[x.SeId] = x;
    }
  }
  return Object.values(map).sort((a, b) => a.StartTime - b.StartTime);
}

function formatPairs(segs) {
  return segs
    .map(s => `${s.SourceText.trim()}\n${s.TargetText.trim()}`)
    .join('\n\n');
}

const summary = summarize(arr);
const out     = formatPairs(summary);

const outName = input.includes('stream')
  ? 'formatted_stream.txt'
  : 'formatted.txt';

fs.writeFileSync(outName, out, 'utf-8');
console.log(`Successfully wrote ${outName} (${summary.length} segments)`);
