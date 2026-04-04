<script setup lang="ts">
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: [profile: { name: string; avatar: string; personality: string; personalityDesc: string | null }]
}>()

const AVATARS = ['🐹', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦉', '🐧', '🐝', '🤖']

const PERSONALITIES = [
  { label: '活潑可愛', desc: '語氣溫暖俏皮，喜歡用「～」「喔」「呢」等語助詞，適度使用 emoji，像一個開朗的小動物夥伴' },
  { label: '溫柔體貼', desc: '語氣溫柔細膩，像一位貼心的好朋友，會關心使用者的心情和感受' },
  { label: '專業幹練', desc: '語氣簡潔有條理，像一位可靠的財務秘書，重點清晰、數據精準' },
  { label: '搞笑幽默', desc: '語氣風趣搞笑，喜歡用諧音梗和雙關語，讓記帳變得開心' },
]

const name = ref('小帳')
const avatar = ref('🐹')
const personality = ref('活潑可愛')
const customDesc = ref('')
const isCustom = ref(false)
const saving = ref(false)
const loaded = ref(false)

async function loadProfile() {
  if (loaded.value) return
  try {
    const data = await $fetch<{
      name: string
      avatar: string
      personality: string
      personalityDesc: string | null
    }>('/api/assistant-profile')
    name.value = data.name
    avatar.value = data.avatar
    personality.value = data.personality
    const isPreset = PERSONALITIES.some(p => p.label === data.personality)
    isCustom.value = !isPreset
    if (!isPreset) {
      customDesc.value = data.personalityDesc || ''
    }
    loaded.value = true
  } catch {
    // Use defaults
  }
}

function selectPersonality(label: string) {
  isCustom.value = false
  personality.value = label
}

function selectCustom() {
  isCustom.value = true
  personality.value = '自訂'
}

async function save() {
  saving.value = true
  try {
    const body: Record<string, string> = {
      name: name.value,
      avatar: avatar.value,
      personality: isCustom.value ? '自訂' : personality.value,
    }
    if (isCustom.value) {
      body.personalityDesc = customDesc.value
    }
    await $fetch('/api/assistant-profile', { method: 'PUT', body })
    emit('saved', {
      name: name.value,
      avatar: avatar.value,
      personality: body.personality,
      personalityDesc: isCustom.value ? customDesc.value : null,
    })
    open.value = false
  } catch {
    // handle error silently
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) loadProfile()
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="overflow-y-auto">
      <SheetHeader class="mb-6">
        <SheetTitle>助理設定</SheetTitle>
        <SheetDescription>自訂你的記帳小助理</SheetDescription>
      </SheetHeader>

      <!-- Name -->
      <div class="mb-6">
        <label class="text-sm font-medium mb-2 block">助理名字</label>
        <Input
          v-model="name"
          placeholder="幫你的助理取個名字"
          maxlength="20"
          class="w-full"
        />
        <p class="text-xs text-muted-foreground mt-1">1-20 字</p>
      </div>

      <!-- Avatar -->
      <div class="mb-6">
        <label class="text-sm font-medium mb-2 block">助理長相</label>
        <div class="grid grid-cols-6 gap-2">
          <button
            v-for="a in AVATARS"
            :key="a"
            @click="avatar = a"
            :class="[
              'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
              avatar === a
                ? 'bg-primary/10 ring-2 ring-primary scale-110'
                : 'bg-gray-50 hover:bg-gray-100'
            ]"
          >
            {{ a }}
          </button>
        </div>
      </div>

      <!-- Personality -->
      <div class="mb-6">
        <label class="text-sm font-medium mb-2 block">助理個性</label>
        <div class="space-y-2">
          <button
            v-for="p in PERSONALITIES"
            :key="p.label"
            @click="selectPersonality(p.label)"
            :class="[
              'w-full text-left rounded-lg px-3 py-2 transition-all border',
              !isCustom && personality === p.label
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <span class="text-sm font-medium">{{ p.label }}</span>
            <p class="text-xs text-muted-foreground mt-0.5">{{ p.desc }}</p>
          </button>

          <!-- Custom -->
          <button
            @click="selectCustom()"
            :class="[
              'w-full text-left rounded-lg px-3 py-2 transition-all border',
              isCustom
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <span class="text-sm font-medium">自訂個性</span>
            <p class="text-xs text-muted-foreground mt-0.5">自由描述你想要的助理個性</p>
          </button>

          <textarea
            v-if="isCustom"
            v-model="customDesc"
            placeholder="例如：像一位老奶奶一樣慈祥溫暖，會叮嚀省錢..."
            maxlength="200"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="isCustom" class="text-xs text-muted-foreground">{{ customDesc.length }}/200 字</p>
        </div>
      </div>

      <!-- Preview -->
      <div class="mb-6 p-3 rounded-lg bg-gray-50 border">
        <p class="text-xs text-muted-foreground mb-1">預覽</p>
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-lg">{{ avatar }}</span>
          <span class="font-medium">{{ name || '小帳' }}</span>
        </div>
      </div>

      <!-- Save -->
      <Button
        @click="save"
        :disabled="saving || !name.trim()"
        class="w-full"
      >
        {{ saving ? '儲存中...' : '儲存設定' }}
      </Button>
    </SheetContent>
  </Sheet>
</template>
