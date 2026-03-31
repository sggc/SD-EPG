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
            <button @click="toggleAuth" class="ml-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="isLoggedIn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-primary-500 text-white hover:bg-primary-600'">
              {{ isLoggedIn ? '已登录' : '登录' }}
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="container mx-auto px-6 py-8">
      <!-- 更新时间 -->
      <div class="glass-card rounded-2xl p-4 mb-8 flex items-center justify-center space-x-3">
        <span class="text-slate-400">🕐</span>
        <span class="text-slate-600">更新时间：{{ data.timestamp }}</span>
      </div>

      <!-- 四大统计卡片 -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div class="stat-card rounded-2xl p-6 text-center" style="--accent-color: #3b82f6">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📡</span>
          </div>
          <p class="text-sm text-slate-500 mb-1">节目总数</p>
          <p class="text-3xl font-bold text-slate-900">{{ data.total_programs?.toLocaleString() || 0 }}</p>
        </div>

        <div class="stat-card rounded-2xl p-6 text-center" style="--accent-color: #10b981">
          <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📅</span>
          </div>
          <p class="text-sm text-slate-500 mb-1">今日节目数</p>
          <p class="text-3xl font-bold text-slate-900">{{ data.today_programs?.toLocaleString() || 0 }}</p>
        </div>

        <div class="stat-card rounded-2xl p-6 text-center" style="--accent-color: #8b5cf6">
          <div class="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">🎯</span>
          </div>
          <p class="text-sm text-slate-500 mb-1">Desc总匹配率</p>
          <p class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {{ data.match_stats?.rate || 0 }}%
          </p>
        </div>

        <div class="stat-card rounded-2xl p-6 text-center" style="--accent-color: #f59e0b">
          <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📅</span>
          </div>
          <p class="text-sm text-slate-500 mb-1">EPG数据日期</p>
          <p class="text-lg font-bold text-slate-900">{{ data.dateRange || 'N/A' }}</p>
        </div>
      </div>

      <!-- 频道列表 -->
      <section class="glass-card rounded-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">全部频道</h2>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
              {{ data.channels?.length || 0 }}
            </span>
          </div>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索频道..."
              class="input-modern pl-10 w-56"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th class="text-left">频道名称</th>
                <th class="text-center">节目总数</th>
                <th class="text-center">今日节目数</th>
                <th class="text-center">DESC总匹配率</th>
                <th class="text-center">DESC今日匹配率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="channel in filteredChannels" :key="channel.name">
                <td class="font-medium text-slate-900">{{ channel.name }}</td>
                <td class="text-center text-slate-600">{{ channel.total?.toLocaleString() || 0 }}</td>
                <td class="text-center text-slate-600">{{ channel.today_total?.toLocaleString() || 0 }}</td>
                <td class="text-center">
                  <span :class="getRateBadgeClass(channel.rate)">{{ channel.rate }}%</span>
                </td>
                <td class="text-center">
                  <span :class="getRateBadgeClass(channel.today_rate)">{{ channel.today_rate }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const isLoggedIn = ref(localStorage.getItem('isLoggedIn') === 'true')
const searchQuery = ref('')

const data = ref({
  timestamp: '',
  dateRange: '',
  total_programs: 0,
  has_desc: 0,
  today_programs: 0,
  today_has_desc: 0,
  match_stats: { rate: 0 },
  today_match_stats: { matched: 0, rate: 0 },
  sources: {},
  channels: []
})

const filteredChannels = computed(() => {
  if (!searchQuery.value) return data.value.channels
  const query = searchQuery.value.toLowerCase()
  return data.value.channels.filter(ch => ch.name.toLowerCase().includes(query))
})

const getRateBadgeClass = (rate) => {
  if (rate >= 90) return 'rate-badge rate-high'
  if (rate >= 70) return 'rate-badge rate-medium'
  if (rate >= 50) return 'rate-badge rate-low'
  return 'rate-badge rate-critical'
}

const toggleAuth = () => {
  isLoggedIn.value = !isLoggedIn.value
  localStorage.setItem('isLoggedIn', isLoggedIn.value)
}

const fetchData = async () => {
  try {
    let url = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/log/dashboard_data.json'
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      url = '/dashboard_data.json'
    }
    const response = await axios.get(url, { timeout: 10000 })
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}

onMounted(() => {
  fetchData()
})
</script>
