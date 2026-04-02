<!-- app/components/ChatBubble.vue -->
<script setup lang="ts">
defineProps<{
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
  loading?: boolean
}>()
</script>

<template>
  <div :class="['flex mb-3', role === 'user' ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
        role === 'user'
          ? 'bg-black text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md',
      ]"
    >
      <!-- Loading animation -->
      <div v-if="loading" class="flex gap-1 py-1">
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
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
