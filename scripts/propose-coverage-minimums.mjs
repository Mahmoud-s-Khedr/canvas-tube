import { readFile } from 'node:fs/promises'
const paths = process.argv.slice(2)
if (paths.length !== 2) {
  console.error('Usage: node scripts/propose-coverage-minimums.mjs <fedora-summary.json> <windows-summary.json>')
  process.exit(1)
}
const reports = await Promise.all(paths.map(async path => JSON.parse(await readFile(path, 'utf8'))))
const minimums = {}
for (const metric of ['statements', 'branches', 'functions', 'lines']) {
  const values = reports.map(report => report.total?.[metric]?.pct)
  if (values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) throw new Error(`Invalid ${metric} platform measurements`)
  minimums[metric] = Math.floor(Math.min(...values))
}
console.log(JSON.stringify({ status: 'verified-platform-minimums', ...minimums }, null, 2))
console.error('Review same-commit platform evidence, then explicitly update coverage-minimums.json. This command never writes or lowers gates.')
