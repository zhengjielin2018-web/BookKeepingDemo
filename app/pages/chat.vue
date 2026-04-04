<!-- app/pages/chat.vue -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
}

interface AssistantProfile {
  name: string
  avatar: string
  personality: string
  personalityDesc: string | null
}

const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const messageList = ref<InstanceType<typeof ChatMessageList> | null>(null)
const assistantProfile = ref<AssistantProfile>({
  name: '小帳',
  avatar: '🐹',
  personality: '活潑可愛',
  personalityDesc: null,
})

// Load history and profile on mount
onMounted(async () => {
  // Load assistant profile and chat history in parallel
  const [profileData, historyData, greetingData] = await Promise.all([
    $fetch<AssistantProfile>('/api/assistant-profile').catch(() => null),
    $fetch<{ messages: { id: string; role: string; content: string }[] }>('/api/chat/history').catch(() => null),
    $fetch<{ greeting: string }>('/api/chat/greeting').catch(() => null),
  ])

  if (profileData) {
    assistantProfile.value = profileData
  }

  if (historyData?.messages?.length) {
    messages.value = historyData.messages.map(m => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'ai',
      text: m.content,
    }))
  }

  // Show greeting as first message if no history
  if (!historyData?.messages?.length && greetingData?.greeting) {
    messages.value.push({
      id: 'greeting',
      role: 'ai',
      text: greetingData.greeting,
    })
  }

  nextTick(() => messageList.value?.scrollToBottom())
})

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
      body: { message: text },
    })

    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: res.reply,
      chart: res.chart,
    })
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

function onAssistantUpdated(profile: AssistantProfile) {
  assistantProfile.value = profile
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between border-b bg-white px-4 py-3">
      <h1 class="text-lg font-bold">
        {{ assistantProfile.name }} {{ assistantProfile.avatar }}
      </h1>
      <UserMenu @assistant-updated="onAssistantUpdated" />
    </header>

    <!-- Messages -->
    <ChatMessageList
      ref="messageList"
      :messages="messages"
      :loading="loading"
      :assistant-avatar="assistantProfile.avatar"
      :assistant-name="assistantProfile.name"
      class="flex-1 max-w-3xl w-full mx-auto"
    />

    <!-- Input -->
    <div class="max-w-3xl w-full mx-auto">
      <ChatInput
        :disabled="loading"
        :placeholder="`跟${assistantProfile.name}說說今天的花費吧～`"
        @send="handleSend"
      />
    </div>

    <!-- Debug Panel -->
    <DebugPanel />
  </div>
</template>
