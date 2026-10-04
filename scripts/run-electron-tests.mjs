import { spawnSync } from 'node:child_process'
const env = { ...process.env }
if (process.argv.includes('--packaged')) env.CANVASTUBE_PACKAGED = '1'
if (process.argv.includes('--performance')) env.CANVASTUBE_PERFORMANCE = '1'
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'test', ...process.argv.slice(2).filter(arg => arg !== '--packaged' && arg !== '--performance')], { env, stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
