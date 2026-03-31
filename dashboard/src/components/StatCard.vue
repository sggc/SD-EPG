<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center">
      <span class="text-3xl mr-3">{{ icon }}</span>
      <div>
        <p class="text-sm text-gray-500">{{ title }}</p>
        <p class="text-2xl font-bold" :class="textColor">{{ value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String,
  color: {
    type: String,
    default: 'blue'
  }
})

const textColor = computed(() => {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600'
  }
  return colors[props.color] || colors.blue
})
</script>
