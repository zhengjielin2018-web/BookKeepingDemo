<!-- app/pages/chat.vue -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
}

interface HistoryMessage {
  role: 'user' | 'model'
  text: string
}

const messages = ref<ChatMessage[]>([])
const conversationHistory = ref<HistoryMessage[]>([])
const loading = ref(false)
const messageList = ref<InstanceType<typeof ChatMessageList> | null>(null)

async function handleSend(text: string) {
  // Add user message
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    text,
  })
  messageList.value?.scrollToBottom()

  loading.value = true
  try {
    const res = await $fetch<{ reply: string; chart: ChatMessage['chart'] }>('/api/chat', {
      method: 'POST',
      body: { message: text, history: conversationHistory.value },
    })

    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: res.reply,
      chart: res.chart,
    })

    // Append to conversation history for next turn
    conversationHistory.value.push(
      { role: 'user', text },
      { role: 'model', text: res.reply },
    )
  } catch (e: any) {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: e?.data?.statusMessage === '請先登入'
        ? '您的登入已過期，請重新登入。'
        : '發生錯誤，請稍後再試',
    })
  } finally {
    loading.value = false
    messageList.value?.scrollToBottom()
  }
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between border-b bg-white px-4 py-3">
      <h1 class="text-lg font-bold">AI 記帳助手</h1>
      <UserMenu />
    </header>

    <!-- Messages -->
    <ChatMessageList
      ref="messageList"
      :messages="messages"
      :loading="loading"
      class="flex-1 max-w-3xl w-full mx-auto"
    />

    <!-- Input -->
    <div class="max-w-3xl w-full mx-auto">
      <ChatInput :disabled="loading" @send="handleSend" />
    </div>

    <!-- Debug Panel -->
    <DebugPanel />
  </div>
</template>
