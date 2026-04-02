<!-- app/components/ChatInput.vue -->
<script setup lang="ts">
const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ send: [message: string] }>()

const message = ref('')

function handleSend() {
  const text = message.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  message.value = ''
}
</script>

<template>
  <form
    @submit.prevent="handleSend"
    class="flex gap-2 border-t bg-white p-3"
  >
    <input
      v-model="message"
      type="text"
      placeholder="輸入訊息，例如「今天午餐 200 元」"
      :disabled="disabled"
      class="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
      @keydown.enter.prevent="handleSend"
    />
    <button
      type="submit"
      :disabled="disabled || !message.trim()"
      class="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
    >
      送出
    </button>
  </form>
</template>
