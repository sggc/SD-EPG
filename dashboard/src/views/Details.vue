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
      <!-- 问题汇总 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div class="glass-card rounded-2xl p-6 border-l-4 border-red-500">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <span class="text-2xl">❌</span>
            </div>
            <div>
              <p class="text-sm text-slate-500">未匹配节目</p>
              <p class="text-2xl font-bold text-slate-900">{{ unmatchedCount }}</p>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-2xl p-6 border-l-4 border-amber-500">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <span class="text-2xl">⚠️</span>
            </div>
            <div>
              <p class="text-sm text-slate-500">低节目量频道</p>
              <p class="text-2xl font-bold text-slate-900">{{ lowProgramCount }}</p>
            </div>
          </div>
        </div>

        <div class="glass-card rounded-2xl p-6 border-l-4 border-green-500">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <span class="text-2xl">✅</span>
            </div>
            <div>
              <p class="text-sm text-slate-500">EPG源状态</p>
              <p class="text-lg font-bold text-green-600">正常</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div class="glass-card rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">匹配来源分布</h3>
          <div class="h-64">
            <Doughnut v-if="chartReady" :data="pieChartData" :options="doughnutOptions" />
          </div>
        </div>

        <div class="glass-card rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">匹配方式统计</h3>
          <div class="h-64">
            <Bar v-if="chartReady" :data="barChartData" :options="barOptions" />
          </div>
        </div>

        <div class="glass-card rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">数据源贡献</h3>
          <div class="space-y-4">
            <div v-for="(value, name) in data.sources" :key="name" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="font-medium text-slate-700">{{ name }}</span>
                <span class="text-slate-500">{{ value.toLocaleString() }}</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getSourceColor(name)"
                  :style="{ width: getSourcePercent(value) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未匹配频道 -->
      <section class="glass-card rounded-2xl overflow-hidden mb-6">
        <div class="px-6 py-4 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            ❌ 未匹配频道 ({{ unmatchedChannels.length }})
          </h2>
        </div>
        <div class="p-6">
          <div v-if="unmatchedChannels.length === 0" class="text-center text-slate-400 py-8">
            太棒了！所有频道都已匹配！
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="channel in unmatchedChannels" :key="channel.name" class="p-4 bg-slate-50 rounded-xl">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-slate-900">{{ channel.name }}</span>
                <span class="rate-badge rate-critical">{{ channel.rate }}%</span>
              </div>
              <p class="text-sm text-slate-500">{{ channel.matched }}/{{ channel.total }} 已匹配</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 低节目量频道 -->
      <section class="glass-card rounded-2xl overflow-hidden mb-6">
        <div class="px-6 py-4 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            ⚠️ 低节目量频道 ({{ lowProgramChannels.length }})
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th class="text-left">频道名称</th>
                <th class="text-center">节目数</th>
                <th class="text-center">匹配率</th>
                <th class="text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="channel in lowProgramChannels" :key="channel.name">
                <td class="font-medium text-slate-900">{{ channel.name }}</td>
                <td class="text-center text-slate-600">{{ channel.total }}</td>
                <td class="text-center"><span :class="getRateBadgeClass(channel.rate)">{{ channel.rate }}%</span></td>
                <td class="text-center"><span class="rate-badge rate-critical">节目过少</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- EPG源配置 -->
      <section class="glass-card rounded-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">📡 EPG数据源状态</h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-emerald-50 rounded-xl flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-emerald-700 font-medium">EPG 主源</span>
              <span class="text-emerald-600 text-sm ml-auto">在线</span>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-emerald-700 font-medium">Desc 数据库</span>
              <span class="text-emerald-600 text-sm ml-auto">在线</span>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl flex items-center space-x-3">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-emerald-700 font-medium">Man-Made 数据</span>
              <span class="text-emerald-600 text-sm ml-auto">在线</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import axios from 'axios'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const isLoggedIn = ref(localStorage.getItem('isLoggedIn') === 'true')
const data = ref({
  summary: { match_stats: {} },
  sources: {},
  channels: []
})

const chartReady = ref(false)
const pieChartData = ref(null)
const barChartData = ref(null)

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } }
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: '#f1f5f9' } }
  }
}

const toggleAuth = () => {
  isLoggedIn.value = !isLoggedIn.value
  localStorage.setItem('isLoggedIn', isLoggedIn.value)
}

const unmatchedChannels = computed(() => {
  return (data.value.channels || []).filter(ch => ch.rate < 50)
})

const lowProgramChannels = computed(() => {
  const all = data.value.channels || []
  if (all.length === 0) return []
  const avg = all.reduce((sum, ch) => sum + ch.total, 0) / all.length
  const threshold = avg * 0.3
  return all.filter(ch => ch.total < threshold)
})

const unmatchedCount = computed(() => unmatchedChannels.value.length)
const lowProgramCount = computed(() => lowProgramChannels.value.length)

const getRateBadgeClass = (rate) => {
  if (rate >= 90) return 'rate-badge rate-high'
  if (rate >= 70) return 'rate-badge rate-medium'
  if (rate >= 50) return 'rate-badge rate-low'
  return 'rate-badge rate-critical'
}

const getSourceColor = (name) => {
  const colors = { 'man-made': 'bg-blue-500', 'source1': 'bg-emerald-500', 'source2': 'bg-purple-500' }
  return colors[name] || 'bg-slate-500'
}

const getSourcePercent = (value) => {
  const total = Object.values(data.value.sources).reduce((sum, v) => sum + v, 0)
  return total > 0 ? (value / total * 100).toFixed(1) : 0
}

const fetchData = async () => {
  try {
    let url = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/log/dashboard_data.json'
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      url = '/dashboard_data.json'
    }
    const response = await axios.get(url, { timeout: 10000 })
    data.value = response.data

    const stats = data.value.summary?.match_stats || {}
    pieChartData.value = {
      labels: ['人工手搓', '同频道匹配', '跨频道匹配'],
      datasets: [{ data: [stats.man_made, stats.same_channel, stats.global], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }]
    }
    barChartData.value = {
      labels: ['人工手搓', '同频道匹配', '跨频道匹配', '未匹配'],
      datasets: [{ data: [stats.man_made, stats.same_channel, stats.global, stats.no_match], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'], borderRadius: 6 }]
    }
    chartReady.value = true
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}

onMounted(() => {
  fetchData()
})
</script>
