import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { loadOperators, searchOperators } from '../src/logic/operatorSearch.js'

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex')
}

// Polyfill fetch for relative path in Node
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  if (typeof url === 'string' && url.startsWith('./data/operators.json')) {
    const content = fs.readFileSync('./public/data/operators.json', 'utf8')
    return {
      json: async () => JSON.parse(content)
    }
  }
  return originalFetch(url, opts)
}

async function verify() {
  console.log('=== 1. Checking Database File Counts ===')
  const opData = JSON.parse(fs.readFileSync('./public/data/operators.json', 'utf8'))
  const idxData = JSON.parse(fs.readFileSync('./public/data/voice-index.json', 'utf8'))
  const rootTexts = JSON.parse(fs.readFileSync('../voice-texts.json', 'utf8'))
  const searchTexts = JSON.parse(fs.readFileSync('../voice-line-search/voice-texts.json', 'utf8'))

  console.log('operators.json count:', opData.length, opData.length === 431 ? 'OK' : 'FAIL')
  console.log('voice-index.json count:', Object.keys(idxData).length, Object.keys(idxData).length === 431 ? 'OK' : 'FAIL')
  console.log('root voice-texts.json count:', Object.keys(rootTexts).length, Object.keys(rootTexts).length === 431 ? 'OK' : 'FAIL')
  console.log('voice-line-search voice-texts.json count:', Object.keys(searchTexts).length, Object.keys(searchTexts).length === 431 ? 'OK' : 'FAIL')

  console.log('\n=== 2. Checking 4 New Operators Voice Files ===')
  const targetOps = ['结城理', '岳羽由加莉', '埃癸斯', '虎狼丸']
  for (const name of targetOps) {
    const file = './public/data/voices/' + name + '.json'
    const exists = fs.existsSync(file)
    if (!exists) {
      console.error(name, 'FILE MISSING')
      continue
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    let cnCount = 0
    let jpCount = 0
    for (const c of Object.values(data['中文'])) cnCount += c.length
    for (const c of Object.values(data['日文'])) jpCount += c.length
    console.log(`${name}: CN clips=${cnCount}, JP clips=${jpCount}, status=${cnCount > 0 && cnCount === jpCount ? 'OK' : 'FAIL'}`)
  }

  console.log('\n=== 3. Checking Operator Search (Pinyin & English) ===')
  const operators = await loadOperators()
  const testQueries = [
    { q: '结城理', expected: '结城理' },
    { q: 'jcl', expected: '结城理' },
    { q: 'makoto', expected: '结城理' },
    { q: '岳羽由加莉', expected: '岳羽由加莉' },
    { q: 'yyyjl', expected: '岳羽由加莉' },
    { q: 'yukari', expected: '岳羽由加莉' },
    { q: '埃癸斯', expected: '埃癸斯' },
    { q: 'ags', expected: '埃癸斯' },
    { q: 'aegis', expected: '埃癸斯' },
    { q: '虎狼丸', expected: '虎狼丸' },
    { q: 'hlw', expected: '虎狼丸' },
    { q: 'koromaru', expected: '虎狼丸' }
  ]

  let searchPass = 0
  for (const t of testQueries) {
    const res = searchOperators(t.q, operators)
    const top = res.length ? res[0].name : 'none'
    const match = top === t.expected
    if (match) searchPass++
    console.log(`Query: "${t.q}" -> Top: ${top} (${match ? 'PASS' : 'FAIL'})`)
  }
  console.log(`Search tests: ${searchPass}/${testQueries.length} ${searchPass === testQueries.length ? 'ALL PASS' : 'FAIL'}`)

  console.log('\n=== 4. Checking Avatars on media.prts.wiki ===')
  for (const opName of targetOps) {
    const op = opData.find(o => o.干员 === opName)
    const filename = parseInt(op.稀有度) >= 3 ? (`头像_${opName}_2.png`) : (`头像_${opName}.png`)
    const hash = md5(filename)
    const url = `https://media.prts.wiki/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(filename)}`
    const res = await fetch(url, { method: 'HEAD' })
    console.log(`${opName} (${filename}) -> status ${res.status} ${res.status === 200 ? 'OK' : 'FAIL'}`)
  }

  console.log('\n=== 5. Checking Audio on torappu.prts.wiki ===')
  for (const opName of targetOps) {
    const file = './public/data/voices/' + opName + '.json'
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const firstUrl = data['中文']['登录'][0].url
    const fullUrl = `https://torappu.prts.wiki/assets/audio/${firstUrl}`
    const res = await fetch(fullUrl, { method: 'HEAD' })
    console.log(`${opName} (${firstUrl}) -> status ${res.status} ${res.status === 200 ? 'OK' : 'FAIL'}`)
  }
}

verify().catch(console.error)
