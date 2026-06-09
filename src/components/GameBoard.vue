<template>
  <div class="game-board">
    <div class="header">
      <div class="logo">🎧 配音猜干员</div>
      <div class="header-sub">听声音，猜干员</div>
    </div>

    <!-- 挑战设置页面 -->
    <template v-if="showChallengeSetup">
      <div class="challenge-setup">
        <button class="back-btn" @click="showChallengeSetup = false">← 返回</button>
        <div class="setup-card">
          <h2 class="setup-title">🏆 挑战模式</h2>
          <p class="setup-desc">20道题，看看你能拿多少分</p>

          <div class="setting-group">
            <div class="setting-label">输入模式</div>
            <div class="toggle-group">
              <button class="toggle-option" :class="{ active: settings.inputMode === 'typing' }" @click="settings.inputMode = 'typing'">输入模式</button>
              <button class="toggle-option" :class="{ active: settings.inputMode === 'choice' }" @click="settings.inputMode = 'choice'">选择模式</button>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">语音语言</div>
            <div class="check-group">
              <div class="check-item" :class="{ checked: settings.languages.includes('中文') }" @click="toggleLang('中文')">
                <div class="check-box">{{ settings.languages.includes('中文') ? '✓' : '' }}</div>
                中文配音
              </div>
              <div class="check-item" :class="{ checked: settings.languages.includes('日文') }" @click="toggleLang('日文')">
                <div class="check-box">{{ settings.languages.includes('日文') ? '✓' : '' }}</div>
                日文配音
              </div>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">每题最大猜测次数</div>
            <div class="slider-container">
              <div class="slider-header">
                <span class="slider-desc">总次数上限</span>
                <span class="slider-value">{{ settings.maxGuesses }}</span>
              </div>
              <input type="range" class="slider" min="3" max="30" v-model.number="settings.maxGuesses" />
              <div class="slider-labels"><span>3</span><span>15</span><span>30</span></div>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">猜几次后播下一条语音</div>
            <div class="slider-container">
              <div class="slider-header">
                <span class="slider-desc">每条次数</span>
                <span class="slider-value">{{ settings.guessesPerClip }}</span>
              </div>
              <input type="range" class="slider" min="1" max="10" v-model.number="settings.guessesPerClip" />
              <div class="slider-labels"><span>1</span><span>5</span><span>10</span></div>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">语音类型</div>
            <div class="check-group">
              <div v-for="vt in voiceTypesList" :key="vt" class="check-item" :class="{ checked: settings.voiceTypes.includes(vt) }" @click="toggleVoiceType(vt)">
                <div class="check-box">{{ settings.voiceTypes.includes(vt) ? '✓' : '' }}</div>
                {{ vt }}
              </div>
            </div>
          </div>

          <button class="start-btn" @click="startChallenge">开始挑战</button>
        </div>
      </div>
    </template>

    <!-- 主页面 -->
    <template v-else>
      <div class="top-controls">
        <button class="ctrl-btn" :class="{ active: settings.inputMode === 'typing' }" @click="settings.inputMode = settings.inputMode === 'typing' ? 'choice' : 'typing'">
          ⌨ {{ settings.inputMode === 'typing' ? '输入模式' : '选择模式' }}
        </button>
        <button class="ctrl-btn text-toggle" :class="{ active: showText }" @click="showText = !showText">
          {{ showText ? '📖 文' : '📖' }}
        </button>
        <button class="ctrl-btn" @click="showChallengeSetup = true">🏆 挑战</button>
        <button class="ctrl-btn" @click="showSettings = true">⚙ 设置</button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-text">加载中...</div>
      </div>

      <template v-else>
        <ChallengeBar v-if="inChallenge" :streak="challenge.streak" :score="challenge.score" :current="challenge.currentQuestion" :total="challenge.totalQuestions" />

        <SummaryReport v-if="inChallenge && challenge.isComplete" v-bind="summaryData" @restart="startChallenge" />

        <template v-else-if="currentQuestion">
          <!-- 显示所有已加载的语音 -->
          <div v-for="(clip, idx) in displayedClips" :key="'clip-' + idx" class="clip-wrapper">
            <AudioPlayer
              :url="clip.url"
              :language="clip.language"
              :voiceType="clip.type"
              :clipIndex="idx + 1"
              :guessesLeft="idx === displayedClips.length - 1 ? guessesLeftForClip : 0"
              :text="showText ? (clip.text || '') : ''"
              @loaded="onAudioLoaded"
              @skip="onAudioSkip"
            />
          </div>

          <GuessInput v-if="settings.inputMode === 'typing'" v-model="guessText" :operators="operators" :history="currentHistory" :disabled="showResult" @submit="onGuess" ref="guessInputRef" />

          <ChoiceMode v-else :choices="currentChoices" :history="currentHistory" @select="onGuess" />

          <ResultCard v-if="showResult" :operator="currentQuestion.operator" :correct="lastGuessCorrect" :clipsUsed="currentClipIndex" :isLast="inChallenge && challenge.currentQuestion >= challenge.totalQuestions - 1" @next="nextQuestion" />
        </template>
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
import { VOICE_TYPES } from '../utils/constants.js'

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
const showText = ref(false)
const showChallengeSetup = ref(false)
const guessText = ref('')
const guessInputRef = ref(null)
const inChallenge = ref(false)
const lastOperatorName = ref(null)
const audioKey = ref(0)

const voiceTypesList = VOICE_TYPES

const settings = reactive({
  inputMode: 'choice',
  languages: ['中文', '日文'],
  maxGuesses: 10,
  guessesPerClip: 3,
  voiceTypes: [...VOICE_TYPES]
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

// 显示所有已加载的语音（递进式）
const displayedClips = computed(() => {
  return currentClips.value.slice(0, currentClipIndex.value)
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
    startNewQuestion()
  }
})

function toggleLang(lang) {
  const idx = settings.languages.indexOf(lang)
  if (idx >= 0) {
    if (settings.languages.length > 1) settings.languages.splice(idx, 1)
  } else {
    settings.languages.push(lang)
  }
}

function toggleVoiceType(vt) {
  const idx = settings.voiceTypes.indexOf(vt)
  if (idx >= 0) settings.voiceTypes.splice(idx, 1)
  else settings.voiceTypes.push(vt)
}

function startChallenge() {
  inChallenge.value = true
  showChallengeSetup.value = false
  challenge.value = createChallenge()
  startNewQuestion()
}

function startNewQuestion() {
  const op = selectRandomOperator(operators.value, voiceMapping.value, lastOperatorName.value)
  if (!op) return

  lastOperatorName.value = op.name

  const clips = getVoiceClips(op.name, voiceMapping.value, settings)
  const numChoices = settings.inputMode === 'choice' ? settings.maxGuesses : 4
  const choices = generateChoices(op, operators.value, numChoices)

  currentQuestion.value = { operator: op }
  currentClips.value = clips.length ? clips : [{ language: '中文', type: '未知', url: '', text: '' }]
  currentClipIndex.value = 1
  currentChoices.value = choices
  currentHistory.value = []
  showResult.value = false
  lastGuessCorrect.value = false
  questionGuessCount.value = 0
  questionStartTime.value = Date.now()
  guessText.value = ''
  audioKey.value++

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

    if (inChallenge.value) {
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
    }
  } else {
    const totalGuessesForClip = questionGuessCount.value % settings.guessesPerClip
    if (totalGuessesForClip === 0 && currentClipIndex.value < currentClips.value.length) {
      currentClipIndex.value++
      audioKey.value++
    }

    if (questionGuessCount.value >= settings.maxGuesses) {
      lastGuessCorrect.value = false
      showResult.value = true

      if (inChallenge.value) {
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
    }

    guessText.value = ''
  }
}

function nextQuestion() {
  if (inChallenge.value && challenge.value.isComplete) return
  startNewQuestion()
}

function onAudioLoaded() {}
function onAudioSkip() {
  // 语音加载失败，自动跳到下一条
  if (currentClipIndex.value < currentClips.value.length) {
    currentClipIndex.value++
    audioKey.value++
  }
}

// 切换输入模式时重新生成选项
watch(() => settings.inputMode, () => {
  if (currentQuestion.value && !showResult.value) {
    const numChoices = settings.inputMode === 'choice' ? settings.maxGuesses : 4
    currentChoices.value = generateChoices(currentQuestion.value.operator, operators.value, numChoices)
  }
})
</script>

<style scoped>
.game-board { position: relative; z-index: 1; max-width: 440px; margin: 0 auto; min-height: 100vh; padding: 24px 20px; display: flex; flex-direction: column; }
.header { text-align: center; padding: 8px 0 20px; }
.logo { font-family: var(--font-display); font-weight: 800; font-size: 30px; letter-spacing: -0.5px; }
.header-sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.top-controls { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.ctrl-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--bg-white); border: 1.5px solid var(--border); border-radius: var(--r-full); font-family: var(--font-body); font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); }
.ctrl-btn:hover { border-color: var(--accent); color: var(--accent); }
.ctrl-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
.text-toggle { font-size: 14px; padding: 8px 12px; }
.loading-state { display: flex; justify-content: center; align-items: center; min-height: 200px; }
.loading-text { font-size: 16px; color: var(--text-muted); }

.clip-wrapper {
  margin-bottom: 12px;
}
.challenge-setup { flex: 1; }
.back-btn { display: flex; align-items: center; gap: 4px; padding: 8px 16px; background: none; border: none; font-family: var(--font-body); font-size: 14px; color: var(--text-secondary); cursor: pointer; margin-bottom: 16px; transition: color 0.2s; }
.back-btn:hover { color: var(--accent); }
.setup-card { background: var(--bg-white); border-radius: var(--r-lg); padding: 28px; box-shadow: var(--shadow-lg); }
.setup-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 4px; }
.setup-desc { text-align: center; color: var(--text-secondary); font-size: 13px; margin-bottom: 24px; }
.setting-group { margin-bottom: 20px; }
.setting-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.toggle-group { display: flex; background: var(--bg-warm); border-radius: var(--r-md); padding: 4px; gap: 4px; }
.toggle-option { flex: 1; padding: 10px; border-radius: var(--r-sm); border: none; background: transparent; font-family: var(--font-body); font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; text-align: center; }
.toggle-option.active { background: white; color: var(--text); box-shadow: var(--shadow-sm); font-weight: 600; }
.check-group { display: flex; gap: 8px; flex-wrap: wrap; }
.check-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--bg-warm); border-radius: var(--r-sm); cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; color: var(--text-secondary); border: 1.5px solid transparent; user-select: none; }
.check-item:hover { background: white; }
.check-item.checked { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
.check-box { width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; transition: all 0.2s; flex-shrink: 0; }
.check-item.checked .check-box { background: var(--accent); border-color: var(--accent); color: white; }
.slider-container { background: var(--bg-warm); border-radius: var(--r-md); padding: 16px; }
.slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.slider-desc { font-size: 13px; color: var(--text-secondary); }
.slider-value { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--accent); }
.slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 8px; }
.slider { -webkit-appearance: none; width: 100%; height: 6px; background: var(--border); border-radius: 3px; outline: none; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 2px 8px rgba(232,101,42,0.3); border: 3px solid white; transition: transform 0.15s; }
.slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.start-btn { width: 100%; margin-top: 8px; padding: 14px; background: var(--accent); color: white; border: none; border-radius: var(--r-md); font-family: var(--font-body); font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(232,101,42,0.2); }
.start-btn:hover { background: var(--accent-hover); box-shadow: 0 6px 20px rgba(232,101,42,0.3); transform: translateY(-1px); }
</style>
