export function selectRandomOperator(operators, voiceMapping) {
  const withVoices = operators.filter(op => voiceMapping[op.name])
  if (!withVoices.length) return null
  return withVoices[Math.floor(Math.random() * withVoices.length)]
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
      for (const path of voices[lang][type]) {
        clips.push({ language: lang, type, url: path })
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

export function generateChoices(correctOperator, operators) {
  const others = operators.filter(op => op.name !== correctOperator.name)
  const shuffled = shuffleArray(others)
  const wrongOptions = shuffled.slice(0, 3)

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
