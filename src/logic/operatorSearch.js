import { pinyin } from 'pinyin-pro'

let operatorsCache = null

export async function loadOperators() {
  if (operatorsCache) return operatorsCache

  const response = await fetch('./data/operators.json')
  const data = await response.json()
  operatorsCache = data.map(op => ({
    name: op['干员'],
    nameEn: op['干员外文名'],
    profession: op['职业'],
    subProfession: op['子职业'],
    rarity: op['稀有度'],
    race: op['种族'],
    country: op['国家'],
    team: op['团队'],
    gender: op['性别'],
    pinyinFull: pinyin(op['干员'], { toneType: 'none', type: 'array' }).join(''),
    pinyinInitials: pinyin(op['干员'], { pattern: 'first', toneType: 'none', type: 'array' }).join('')
  }))
  return operatorsCache
}

export function searchOperators(query, operators) {
  if (!query || !query.trim()) return []

  const q = query.trim().toLowerCase()

  return operators.filter(op => {
    if (op.name.includes(q)) return true
    if (op.nameEn && op.nameEn.toLowerCase().includes(q)) return true
    if (op.pinyinFull.startsWith(q)) return true
    if (op.pinyinInitials.startsWith(q)) return true
    return false
  }).slice(0, 10)
}
