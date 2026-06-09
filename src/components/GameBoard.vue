<template>
  <div class="game-board">
    <div class="header">
      <div class="logo">🎧 配音猜干员</div>
      <div class="header-sub">听声音，猜干员</div>
    </div>

    <div class="top-controls">
      <button class="ctrl-btn" :class="{ active: settings.inputMode === 'typing' }" @click="settings.inputMode = 'typing'">⌨ 自由输入</button>
      <button class="ctrl-btn" @click="showSettings = true">⚙ 设置</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-text">加载中...</div>
    </div>

    <template v-else>
      <ChallengeBar :streak="challenge.streak" :score="challenge.score" :current="challenge.currentQuestion" :total="challenge.totalQuestions" />

      <SummaryReport v-if="challenge.isComplete" v-bind="summaryData" @restart="startNewChallenge" />

      <template v-else-if="currentQuestion">
        <AudioPlayer :key="currentClipIndex" :url="currentClip?.url" :language="currentClip?.language" :voiceType="currentClip?.type" :clipIndex="currentClipIndex" :guessesLeft="guessesLeftForClip" @loaded="onAudioLoaded" @error="onAudioError" />

        <GuessInput v-if="settings.inputMode === 'typing'" v-model="guessText" :operators="operators" :history="currentHistory" :disabled="showResult" @submit="onGuess" ref="guessInputRef" />

        <ChoiceMode v-else :choices="currentChoices" :history="currentHistory" @select="onGuess" />

        <ResultCard v-if="showResult" :operator="currentQuestion.operator" :correct="lastGuessCorrect" :clipsUsed="currentClipIndex" :isLast="challenge.currentQuestion >= challenge.totalQuestions - 1" @next="nextQuestion" />
      </template>
    </template>

    <SettingsDrawer v-model="showSettings" v-model:inputMode="settings.inputMode" v-model:languages="settings.languages" v-model:maxGuesses="settings.maxGuesses" v-model:guessesPerClip="settings.guessesPerClip" v-model:selectedVoiceTypes="settings.voiceTypes" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { loadOperators } from '../logic/operatorSearch.js'
import { selectRandomOperator, getVoiceClips, generateChoices } from '../logic/gameEngine.js'
import { createChallenge, recordQuestion, generateSummary } from '../logic/challenge.js'

import AudioPlayer from './AudioPlayer.vue'
import GuessInput from './GuessInput.vue'
import ChoiceMode from './ChoiceMode.vue'
import ResultCard from './ResultCard.vue'
import SettingsDrawer from './SettingsDrawer.vue'
import ChallengeBar from './ChallengeBar.vue'
import SummaryReport from './SummaryReport.vue'

const loading = ref(true)
const operators = ref([])
const voiceMapping = ref({})
const showSettings = ref(false)
const guessText = ref('')
const guessInputRef = ref(null)

const settings = reactive({
  inputMode: 'typing',
  languages: ['中文', '日文'],
  maxGuesses: 10,
  guessesPerClip: 3,
  voiceTypes: []
})

const challenge = ref(createChallenge())

const currentQuestion = ref(null)
const currentClipIndex = ref(1)
const currentClips = ref([])
const currentChoices = ref([])
const currentHistory = ref([])
const showResult = ref(false)
const lastGuessCorrect = ref(false)
const questionGuessCount = ref(0)
const questionStartTime = ref(0)

const currentClip = computed(() => {
  return currentClips.value[currentClipIndex.value - 1] || null
})

const guessesLeftForClip = computed(() => {
  return Math.max(0, settings.guessesPerClip - (questionGuessCount.value % settings.guessesPerClip))
})

const summaryData = computed(() => generateSummary(challenge.value))

onMounted(async () => {
  try {
    operators.value = await loadOperators()
    const resp = await fetch('./data/voice-mapping.json')
    voiceMapping.value = await resp.json()
  } catch (e) {
    console.error('Failed to load data:', e)
  } finally {
    loading.value = false
    startNewChallenge()
  }
})

function startNewQuestion() {
  const op = selectRandomOperator(operators.value, voiceMapping.value)
  if (!op) return

  const clips = getVoiceClips(op.name, voiceMapping.value, settings)
  const choices = generateChoices(op, operators.value)

  currentQuestion.value = { operator: op }
  currentClips.value = clips.length ? clips : [{ language: '中文', type: '未知', url: '' }]
  currentClipIndex.value = 1
  currentChoices.value = choices
  currentHistory.value = []
  showResult.value = false
  lastGuessCorrect.value = false
  questionGuessCount.value = 0
  questionStartTime.value = Date.now()
  guessText.value = ''

  nextTick(() => {
    guessInputRef.value?.focus()
  })
}

function onGuess(name) {
  if (showResult.value) return

  const correct = name === currentQuestion.value.operator.name
  questionGuessCount.value++

  currentHistory.value.push({ name, correct })

  if (correct) {
    lastGuessCorrect.value = true
    showResult.value = true

    const timeUsed = Math.round((Date.now() - questionStartTime.value) / 1000)
    challenge.value = recordQuestion(challenge.value, {
      operatorName: currentQuestion.value.operator.name,
      guessed: name,
      correct: true,
      clipsUsed: currentClipIndex.value,
      language: currentClip.value?.language || '中文',
      timeUsed: `${timeUsed}s`,
      isChoiceMode: settings.inputMode === 'choice'
    })
  } else {
    const totalGuessesForClip = questionGuessCount.value % settings.guessesPerClip
    if (totalGuessesForClip === 0 && currentClipIndex.value < currentClips.value.length) {
      currentClipIndex.value++
    }

    if (questionGuessCount.value >= settings.maxGuesses) {
      lastGuessCorrect.value = false
      showResult.value = true

      const timeUsed = Math.round((Date.now() - questionStartTime.value) / 1000)
      challenge.value = recordQuestion(challenge.value, {
        operatorName: currentQuestion.value.operator.name,
        guessed: name,
        correct: false,
        clipsUsed: currentClipIndex.value,
        language: currentClip.value?.language || '中文',
        timeUsed: `${timeUsed}s`,
        isChoiceMode: settings.inputMode === 'choice'
      })
    }

    guessText.value = ''
  }
}

function nextQuestion() {
  if (challenge.value.isComplete) return
  startNewQuestion()
}

function startNewChallenge() {
  challenge.value = createChallenge()
  startNewQuestion()
}

function onAudioLoaded() {}

function onAudioError(e) {
  console.warn('Audio error:', e)
}

watch(() => [settings.languages, settings.voiceTypes], () => {
  if (!loading.value && !challenge.value.isComplete) {
    startNewQuestion()
  }
})
</script>

<style scoped>
.game-board {
  position: relative;
  z-index: 1;
  max-width: 440px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 8px 0 20px;
}

.logo {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 30px;
  letter-spacing: -0.5px;
}

.header-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.top-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-white);
  border: 1.5px solid var(--border);
  border-radius: var(--r-full);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.ctrl-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ctrl-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-text {
  font-size: 16px;
  color: var(--text-muted);
}
</style>
