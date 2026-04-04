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
  assistantAvatar?: string
  assistantName?: string
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
    <ChatBubble
      v-for="msg in messages"
      :key="msg.id"
      :role="msg.role"
      :text="msg.text"
      :chart="msg.chart"
      :assistant-avatar="assistantAvatar"
      :assistant-name="assistantName"
    />

    <!-- AI loading bubble -->
    <ChatBubble
      v-if="loading"
      role="ai"
      text=""
      :loading="true"
      :assistant-avatar="assistantAvatar"
      :assistant-name="assistantName"
    />
  </div>
</template>
