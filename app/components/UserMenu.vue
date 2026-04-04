<!-- app/components/UserMenu.vue -->
<script setup lang="ts">
const { data: session, signOut } = useAuth()
const config = useRuntimeConfig()

const open = ref(false)
const settingsOpen = ref(false)

const emit = defineEmits<{
  assistantUpdated: [profile: { name: string; avatar: string; personality: string; personalityDesc: string | null }]
}>()

async function handleLogout() {
  await signOut({ redirect: false })
  navigateTo('/')
}

function openSettings() {
  open.value = false
  settingsOpen.value = true
}

function onAssistantSaved(profile: { name: string; avatar: string; personality: string; personalityDesc: string | null }) {
  emit('assistantUpdated', profile)
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-100"
    >
      <span class="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">
        {{ session?.user?.name?.[0] || session?.user?.email?.[0] || '?' }}
      </span>
      <span class="hidden md:inline">{{ session?.user?.name || session?.user?.email }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-lg py-1 z-50"
    >
      <div class="px-3 py-2 text-sm text-gray-500 border-b">
        {{ session?.user?.email }}
      </div>
      <button
        @click="openSettings"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
      >
        助理設定
      </button>
      <button
        @click="handleLogout"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
      >
        登出
      </button>
      <div class="px-3 py-2 text-xs text-gray-400 border-t">
        v{{ config.public.appVersion }}
      </div>
    </div>

    <!-- Click outside to close -->
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />

    <!-- Assistant Settings Sheet -->
    <AssistantSettings v-model:open="settingsOpen" @saved="onAssistantSaved" />
  </div>
</template>
