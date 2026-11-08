import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

function applyFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value
  }
}

export function loadEnv() {
  const candidates = [
    path.join(app.getAppPath(), '.env'),
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(app.getPath('exe')), '.env'),
  ]
  const seen = new Set()
  for (const filePath of candidates) {
    if (seen.has(filePath)) continue
    seen.add(filePath)
    if (fs.existsSync(filePath)) applyFile(filePath)
  }
}

export function modelConfig() {
  return {
    model: process.env.OPENROUTER_MODEL || '',
    hasKey: Boolean(process.env.OPENROUTER_API_KEY),
  }
}
