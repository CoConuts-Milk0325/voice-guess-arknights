<template>
  <div class="audio-card">
    <div class="audio-header">
      <span class="audio-clip-label">第 {{ clipIndex }} 条语音</span>
      <span class="audio-lang-badge" :class="languageClass">{{ language }}</span>
    </div>
    <div class="player">
      <button class="play-btn" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="progress-track" @click="seek">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="time-label">{{ formatTime(currentTime) }}</span>
    </div>
    <div class="audio-footer">
      <span class="voice-type">{{ voiceType }}</span>
      <span class="guesses-left">
        还可猜 <strong>{{ guessesLeft }}</strong> 次
      </span>
    </div>
    <div v-if="text" class="voice-text">
      <div class="voice-text-content">「{{ text }}」</div>
    </div>
    <div v-if="loadError" class="voice-error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ loadError }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { loadAudio, stopAudio, getCurrentAudio, buildVoiceUrl } from '../logic/audioLoader.js'

const props = defineProps({
  url: { type: String, required: true },
  language: { type: String, default: '中文' },
  voiceType: { type: String, default: '' },
  clipIndex: { type: Number, default: 1 },
  guessesLeft: { type: Number, default: 3 },
  text: { type: String, default: '' }
})

const emit = defineEmits(['loaded', 'error', 'skip'])

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let progressInterval = null

const progressPercent = ref(0)
const languageClass = ref('')
const loadError = ref('')

watch(() => props.language, (lang) => {
  languageClass.value = lang === '中文' ? 'lang-zh' : 'lang-jp'
}, { immediate: true })

watch(() => props.url, async (newUrl) => {
  console.log('AudioPlayer: url changed to', newUrl)
  if (!newUrl) {
    loadError.value = '无语音URL'
    return
  }
  stopAudio()
  isPlaying.value = false
  currentTime.value = 0
  progressPercent.value = 0
  loadError.value = ''

  const fullUrl = buildVoiceUrl(newUrl)
  console.log('AudioPlayer: loading', fullUrl)
  try {
    await loadAudio(fullUrl)
    const audio = getCurrentAudio()
    if (audio) {
      duration.value = audio.duration || 5
      emit('loaded')
    }
  } catch (e) {
    console.error('AudioPlayer: load failed', e)
    loadError.value = `加载失败，跳过...`
    emit('skip')
  }
}, { immediate: true })

function togglePlay() {
  const audio = getCurrentAudio()
  if (!audio) return

  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
    stopProgress()
  } else {
    audio.play().then(() => {
      isPlaying.value = true
      startProgress()
    }).catch(e => {
      loadError.value = '播放失败，请点击页面后重试'
    })
  }
}

function startProgress() {
  stopProgress()
  progressInterval = setInterval(() => {
    const audio = getCurrentAudio()
    if (audio) {
      currentTime.value = audio.currentTime
      duration.value = audio.duration || 5
      progressPercent.value = (currentTime.value / duration.value) * 100

      if (audio.ended) {
        isPlaying.value = false
        stopProgress()
      }
    }
  }, 100)
}

function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

function seek(e) {
  const audio = getCurrentAudio()
  if (!audio) return
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  audio.currentTime = percent * (audio.duration || 5)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

onUnmounted(() => {
  stopProgress()
  stopAudio()
})
</script>

<style scoped>
.audio-card {
  background: var(--bg-white);
  border-radius: var(--r-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.audio-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent), #f59e0b);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}

.audio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.audio-clip-label {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.audio-lang-badge {
  padding: 4px 12px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 500;
}

.lang-zh {
  background: var(--blue-light);
  color: var(--blue);
}

.lang-jp {
  background: #fdf2f8;
  color: #db2777;
}

.player {
  display: flex;
  align-items: center;
  gap: 14px;
}

.play-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(232, 101, 42, 0.3);
  flex-shrink: 0;
}

.play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(232, 101, 42, 0.4);
}

.play-btn:active {
  transform: scale(0.97);
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--border-light);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.time-label {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
  min-width: 36px;
  text-align: right;
}

.audio-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
}

.voice-type {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.guesses-left {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.guesses-left strong {
  color: var(--accent);
  font-weight: 700;
}

.voice-text {
  margin-top: 14px;
  padding: 12px 16px;
  background: var(--bg-warm);
  border-radius: var(--r-md);
  border-left: 3px solid var(--accent);
}

.voice-text-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-style: italic;
}

.voice-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--red-light);
  border-radius: var(--r-sm);
  border-left: 3px solid var(--red);
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 14px;
}

.error-text {
  font-size: 12px;
  color: var(--red);
  font-weight: 500;
}
</style>
