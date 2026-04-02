<!-- app/components/ChatMessageList.vue -->
<script setup lang="ts">
interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
}

defineProps<{
  messages: Message[]
  loading: boolean
}>()

const listRef = ref<HTMLDivElement>()

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto p-4">
    <div v-if="messages.length === 0" class="flex h-full items-center justify-center text-gray-400 text-sm">
      輸入訊息開始記帳，例如「今天午餐 200 元」
    </div>

    <ChatBubble
      v-for="msg in messages"
      :key="msg.id"
      :role="msg.role"
      :text="msg.text"
      :chart="msg.chart"
    />

    <!-- AI loading bubble -->
    <ChatBubble
      v-if="loading"
      role="ai"
      text=""
      :loading="true"
    />
  </div>
</template>
