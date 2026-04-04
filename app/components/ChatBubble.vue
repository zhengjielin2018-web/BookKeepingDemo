<!-- app/components/ChatBubble.vue -->
<script setup lang="ts">
defineProps<{
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
  loading?: boolean
  assistantAvatar?: string
  assistantName?: string
}>()
</script>

<template>
  <div :class="['flex mb-3', role === 'user' ? 'justify-end' : 'justify-start']">
    <!-- AI avatar -->
    <span
      v-if="role === 'ai'"
      class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1"
    >
      {{ assistantAvatar || '🐹' }}
    </span>

    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
        role === 'user'
          ? 'bg-black text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md',
      ]"
    >
      <!-- Loading animation -->
      <div v-if="loading" class="flex flex-col items-start gap-1 py-1">
        <div class="flex gap-1">
          <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
          <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
          <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>
        <span class="text-xs text-gray-400">{{ assistantName || '小帳' }}正在思考中...</span>
      </div>

      <!-- Text content -->
      <div v-else>
        <p class="whitespace-pre-wrap">{{ text }}</p>

        <!-- Inline chart (client-only to avoid SSR Canvas issues) -->
        <ClientOnly v-if="chart">
          <ChatChart :chart="chart" class="mt-3" />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>
