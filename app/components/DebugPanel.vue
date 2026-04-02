<!-- app/components/DebugPanel.vue -->
<script setup lang="ts">
interface LogEntry {
  timestamp: string
  type: string
  message: string
  data?: unknown
}

const visible = ref(false)
const logs = ref<LogEntry[]>([])
const panelRef = ref<HTMLDivElement>()
let eventSource: EventSource | null = null

const isDev = import.meta.dev

function connect() {
  if (!isDev || eventSource) return
  eventSource = new EventSource('/api/debug/logs')
  eventSource.onmessage = (event) => {
    const entry = JSON.parse(event.data) as LogEntry
    logs.value.push(entry)
    // Keep last 200 logs
    if (logs.value.length > 200) logs.value.shift()
    nextTick(() => {
      if (panelRef.value) panelRef.value.scrollTop = panelRef.value.scrollHeight
    })
  }
}

function disconnect() {
  eventSource?.close()
  eventSource = null
}

function toggle() {
  visible.value = !visible.value
  if (visible.value) connect()
  else disconnect()
}

// Ctrl+D shortcut
onMounted(() => {
  if (!isDev) return
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      toggle()
    }
  })
})

onUnmounted(() => disconnect())

const typeColors: Record<string, string> = {
  Gemini: 'text-blue-600',
  DB: 'text-green-600',
  Auth: 'text-purple-600',
  Error: 'text-red-600',
}
</script>

<template>
  <div v-if="isDev">
    <!-- Toggle button -->
    <button
      @click="toggle"
      class="fixed bottom-4 right-4 z-50 rounded-full bg-gray-800 p-2 text-white shadow-lg hover:bg-gray-700 md:bottom-auto md:top-4"
      title="Debug Panel (Ctrl+D)"
    >
      <span class="text-xs font-mono">DBG</span>
    </button>

    <!-- Panel: right slide on desktop, bottom drawer on mobile -->
    <Transition
      enter-active-class="transition-transform duration-200"
      leave-active-class="transition-transform duration-200"
      enter-from-class="translate-x-full md:translate-x-full translate-y-full md:translate-y-0"
      leave-to-class="translate-x-full md:translate-x-full translate-y-full md:translate-y-0"
    >
      <div
        v-if="visible"
        class="fixed z-50 bg-gray-900 text-gray-100 text-xs font-mono
               bottom-0 left-0 right-0 h-1/2
               md:top-0 md:right-0 md:left-auto md:bottom-0 md:h-full md:w-96"
      >
        <div class="flex items-center justify-between border-b border-gray-700 px-3 py-2">
          <span class="font-bold">Debug Logs</span>
          <div class="flex gap-2">
            <button @click="logs = []" class="hover:text-white text-gray-400">Clear</button>
            <button @click="toggle" class="hover:text-white text-gray-400">Close</button>
          </div>
        </div>
        <div ref="panelRef" class="overflow-y-auto h-[calc(100%-2.5rem)] p-2 space-y-1">
          <div v-for="(log, i) in logs" :key="i" class="leading-tight">
            <span class="text-gray-500">{{ log.timestamp.split('T')[1]?.slice(0, 8) }}</span>
            <span :class="typeColors[log.type] || 'text-gray-300'" class="ml-1">[{{ log.type }}]</span>
            <span class="ml-1">{{ log.message }}</span>
            <pre v-if="log.data" class="ml-4 text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
