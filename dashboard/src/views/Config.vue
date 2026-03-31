<template>
  <div class="min-h-screen">
    <!-- 导航栏 -->
    <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span class="text-white text-lg">📺</span>
            </div>
            <h1 class="text-lg font-semibold text-slate-900">EPG聚合发布平台</h1>
          </div>
          <nav class="flex items-center space-x-1">
            <router-link to="/" class="nav-link text-slate-600 hover:text-slate-900">首页</router-link>
            <router-link to="/details" class="nav-link text-slate-600 hover:text-slate-900">详情</router-link>
            <button @click="logout" class="ml-4 px-4 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
              退出登录
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="container mx-auto px-6 py-8">
      <!-- Token 输入（未登录时显示） -->
      <div v-if="!isAuthenticated" class="max-w-md mx-auto glass-card rounded-2xl p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">🔐</span>
          </div>
          <h2 class="text-xl font-semibold text-slate-900">管理员登录</h2>
          <p class="text-sm text-slate-500 mt-2">请输入 GitHub Personal Access Token</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">GitHub Token</label>
            <input
              v-model="tokenInput"
              type="password"
              class="input-modern"
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </div>
          <button @click="login" class="btn-primary w-full" :disabled="!tokenInput || loading">
            {{ loading ? '验证中...' : '登录' }}
          </button>
          <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>
        </div>
      </div>

      <!-- 已登录时显示配置 -->
      <template v-else>
        <!-- 提示 -->
        <div class="glass-card rounded-2xl p-4 mb-8 border-l-4 border-amber-500">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">⚠️</span>
            <span class="text-amber-800">此页面仅限管理员访问，请谨慎修改配置。</span>
          </div>
        </div>

        <!-- 配置卡片 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- EPG 配置 -->
          <div class="glass-card rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">📡 EPG 源配置</h2>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">EPG 源 URL</label>
                <input v-model="config.epgUrl" type="text" class="input-modern" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">更新频率</label>
                <select v-model="config.epgInterval" class="input-modern">
                  <option value="1">每小时</option>
                  <option value="6">每6小时</option>
                  <option value="12">每12小时</option>
                  <option value="24">每天</option>
                </select>
              </div>
              <button @click="saveConfig('epg')" class="btn-primary w-full" :disabled="saving">
                {{ saving ? '保存中...' : '保存 EPG 配置' }}
              </button>
            </div>
          </div>

          <!-- Desc 配置 -->
          <div class="glass-card rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">📝 Desc 注入配置</h2>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Desc 数据库 URL</label>
                <input v-model="config.descDbUrl" type="text" class="input-modern" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Man-Made URL</label>
                <input v-model="config.manMadeUrl" type="text" class="input-modern" />
              </div>
              <div class="flex items-center space-x-3">
                <input v-model="config.enableFuzzy" type="checkbox" id="enableFuzzy" class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <label for="enableFuzzy" class="text-sm text-slate-700">启用模糊匹配</label>
              </div>
              <button @click="saveConfig('desc')" class="btn-primary w-full" :disabled="saving">
                {{ saving ? '保存中...' : '保存 Desc 配置' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 操作日志 -->
        <div class="glass-card rounded-2xl mt-6">
          <div class="px-6 py-4 border-b border-slate-100">
            <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">📋 操作日志</h2>
          </div>
          <div class="p-6 max-h-48 overflow-y-auto">
            <div v-if="logs.length === 0" class="text-center text-slate-400">暂无操作记录</div>
            <div v-else class="space-y-2 text-sm">
              <div v-for="(log, index) in logs" :key="index" class="flex items-start space-x-3">
                <span :class="log.type === 'success' ? 'text-emerald-500' : 'text-red-500'">
                  {{ log.type === 'success' ? '✓' : '✗' }}
                </span>
                <span class="text-slate-600">{{ log.message }}</span>
                <span class="text-slate-400 ml-auto">{{ log.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 保存成功提示 -->
      <transition name="fade">
        <div v-if="saveMessage" class="fixed bottom-8 right-8 glass-card rounded-xl px-6 py-4 shadow-xl">
          <div class="flex items-center space-x-3">
            <span class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span class="text-emerald-600">✓</span>
            </span>
            <span class="text-slate-700">{{ saveMessage }}</span>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const tokenInput = ref('')
const token = ref('')
const isAuthenticated = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const saveMessage = ref('')
const logs = ref([])

const config = ref({
  epgUrl: '',
  epgInterval: '12',
  descDbUrl: '',
  manMadeUrl: '',
  enableFuzzy: true
})

const GITHUB_API = 'https://api.github.com'
const REPO_OWNER = 'sggc'
const REPO_NAME = 'SD-EPG'
const CONFIG_FILE_PATH = 'config/epg-config.json'

const addLog = (message, type = 'success') => {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  logs.value.unshift({ message, type, time })
  if (logs.value.length > 50) logs.value.pop()
}

const login = async () => {
  if (!tokenInput.value) return
  loading.value = true
  error.value = ''

  try {
    const response = await axios.get(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `token ${tokenInput.value}`
      }
    })

    if (response.data.login) {
      token.value = tokenInput.value
      isAuthenticated.value = true
      localStorage.setItem('gh_token', token.value)
      addLog(`登录成功：${response.data.login}`)
      await loadConfig()
    }
  } catch (err) {
    error.value = 'Token 无效或已过期'
    addLog('登录失败：Token 无效或已过期', 'error')
  } finally {
    loading.value = false
  }
}

const logout = () => {
  token.value = ''
  isAuthenticated.value = false
  localStorage.removeItem('gh_token')
  router.push('/')
}

const loadConfig = async () => {
  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_FILE_PATH}`,
      {
        headers: { Authorization: `token ${token.value}` }
      }
    )

    if (response.data.content) {
      const decoded = atob(response.data.content)
      const loadedConfig = JSON.parse(decoded)
      config.value = { ...config.value, ...loadedConfig }
      addLog('配置已从 GitHub 加载')
    }
  } catch (err) {
    if (err.response?.status === 404) {
      addLog('配置文件不存在，将使用默认配置')
    } else {
      addLog('加载配置失败：' + err.message, 'error')
    }
  }
}

const saveConfig = async (type) => {
  saving.value = true
  saveMessage.value = ''

  try {
    const filePath = type === 'epg' ? 'config/epg-source.json' : 'config/desc-config.json'

    let content = {}
    if (type === 'epg') {
      content = {
        epgUrl: config.value.epgUrl,
        epgInterval: config.value.epgInterval,
        updatedAt: new Date().toISOString()
      }
    } else {
      content = {
        descDbUrl: config.value.descDbUrl,
        manMadeUrl: config.value.manMadeUrl,
        enableFuzzy: config.value.enableFuzzy,
        updatedAt: new Date().toISOString()
      }
    }

    const encodedContent = btoa(JSON.stringify(content, null, 2))

    let sha = null
    try {
      const existing = await axios.get(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
        { headers: { Authorization: `token ${token.value}` } }
      )
      sha = existing.data.sha
    } catch (e) {
      if (e.response?.status !== 404) throw e
    }

    const payload = {
      message: `chore: 更新 ${type === 'epg' ? 'EPG' : 'Desc'} 配置`,
      content: encodedContent,
      sha: sha || undefined
    }

    await axios.put(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
      payload,
      { headers: { Authorization: `token ${token.value}` } }
    )

    saveMessage.value = `${type === 'epg' ? 'EPG' : 'Desc'} 配置已保存到 GitHub！`
    addLog(`${type === 'epg' ? 'EPG' : 'Desc'} 配置已保存`)
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (err) {
    addLog(`保存失败：${err.message}`, 'error')
    saveMessage.value = '保存失败：' + err.message
    setTimeout(() => { saveMessage.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const savedToken = localStorage.getItem('gh_token')
  if (savedToken) {
    token.value = savedToken
    tokenInput.value = savedToken
    isAuthenticated.value = true
    loadConfig()
  }
})
</script>
