export function selectRandomOperator(operators, lastName = null) {
  if (!operators.length) return null

  // Try to avoid consecutive same operator
  if (lastName && operators.length > 1) {
    const filtered = operators.filter(op => op.name !== lastName)
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)]
    }
  }

  return operators[Math.floor(Math.random() * operators.length)]
}

export function getVoiceClips(operatorName, voiceMapping, settings) {
  const voices = voiceMapping[operatorName]
  if (!voices) return []

  const { languages, voiceTypes } = settings
  const clips = []

  const availableLanguages = Object.keys(voices).filter(lang => {
    if (Object.keys(voices).length === 1) return true
    return languages.includes(lang)
  })

  for (const lang of availableLanguages) {
    const types = Object.keys(voices[lang])
    const filteredTypes = voiceTypes.length > 0
      ? types.filter(t => voiceTypes.includes(t))
      : types

    for (const type of filteredTypes) {
      for (const entry of voices[lang][type]) {
        // Support both old format (string) and new format (object with url and text)
        const url = typeof entry === 'string' ? entry : entry.url
        const text = typeof entry === 'string' ? '' : (entry.text || '')
        clips.push({ language: lang, type, url, text })
      }
    }
  }

  return shuffleArray(clips)
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateChoices(correctOperator, operators, numChoices = 4) {
  const others = operators.filter(op => op.name !== correctOperator.name)
  const shuffled = shuffleArray(others)
  const wrongCount = Math.max(1, numChoices - 1)
  const wrongOptions = shuffled.slice(0, wrongCount)

  const options = [correctOperator, ...wrongOptions]
  return shuffleArray(options)
}

export function calculateScore(clipsUsed, isChoiceMode) {
  let score = 100

  if (clipsUsed === 1) score += 50
  else if (clipsUsed === 2) score += 30
  else if (clipsUsed === 3) score += 10

  if (isChoiceMode) {
    score = 100
  }

  return score
}
