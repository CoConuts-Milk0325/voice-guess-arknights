import { CDN_BASE } from '../utils/constants.js'

const cache = new Map()
let currentAudio = null

export function buildVoiceUrl(relativePath) {
  return `${CDN_BASE}${relativePath}`
}

export function loadAudio(url) {
  stopAudio()

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'

    audio.addEventListener('canplaythrough', () => {
      console.log('Audio loaded OK:', url)
      resolve(audio)
    }, { once: true })

    audio.addEventListener('error', (e) => {
      console.error('Audio load error:', url, e)
      reject(new Error(`Failed to load: ${url}`))
    }, { once: true })

    console.log('Setting audio src:', url)
    audio.src = url
    cache.set(url, audio)
    currentAudio = audio
  })
}

export function playAudio(url) {
  return loadAudio(url).then(audio => {
    return audio.play()
  })
}

export function stopAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

export function getCurrentAudio() {
  return currentAudio
}

export function preloadAudio(url) {
  if (cache.has(url)) return

  const audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.preload = 'metadata'
  audio.src = url
  cache.set(url, audio)
}
