import { pinyin } from 'pinyin-pro'

let operatorsCache = null

// 归一化：转小写并去掉所有特殊字符（保留中文/字母/数字），用于忽略大小写和特殊字符匹配
function normalize(s) {
  return (s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

export async function loadOperators() {
  if (operatorsCache) return operatorsCache

  const response = await fetch('./data/operators.json')
  const data = await response.json()
  operatorsCache = data.map(op => {
    const name = op['干员']
    const nameEn = op['干员外文名']
    const pinyinFull = pinyin(name, { toneType: 'none', type: 'array' }).join('')
    return {
      name,
      nameEn,
      profession: op['职业'],
      subProfession: op['子职业'],
      rarity: op['稀有度'],
      race: op['种族'],
      country: op['国家'],
      team: op['团队'],
      gender: op['性别'],
      pinyinFull,
      pinyinInitials: pinyin(name, { pattern: 'first', toneType: 'none', type: 'array' }).join(''),
      normName: normalize(name),
      normNameEn: normalize(nameEn),
      normPinyin: normalize(pinyinFull)
    }
  })
  return operatorsCache
}

export function searchOperators(query, operators) {
  if (!query || !query.trim()) return []

  const q = normalize(query)
  if (!q) return []

  const scored = []
  for (const op of operators) {
    const score = scoreMatch(op, q)
    if (score > 0) scored.push({ op, score })
  }

  // 按匹配度降序，同类保持原顺序
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 10).map(s => s.op)
}

// 匹配打分：中文名 > 拼音 > 英文名
function scoreMatch(op, q) {
  let score = 0
  if (op.normName === q) score = 1000
  else if (op.normName.startsWith(q)) score = 800
  else if (op.normName.includes(q)) score = 600
  else if (op.normPinyin === q) score = 750
  else if (op.normPinyin.startsWith(q)) score = 550
  else if (op.normPinyin.includes(q)) score = 300
  else if (op.pinyinInitials === q) score = 500
  else if (op.pinyinInitials.startsWith(q)) score = 400
  else if (op.normNameEn && op.normNameEn === q) score = 700
  else if (op.normNameEn && op.normNameEn.startsWith(q)) score = 350
  else if (op.normNameEn && op.normNameEn.includes(q)) score = 200
  return score
}
