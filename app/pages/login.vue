<!-- app/pages/login.vue -->
<script setup lang="ts">
const { signIn } = useAuth()

const activeTab = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const inviteCode = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const result = await signIn('credentials', {
      email: email.value,
      password: password.value,
      redirect: false,
    })
    if (result?.error) {
      error.value = 'Email 或密碼錯誤'
    } else {
      navigateTo('/chat')
    }
  } catch {
    error.value = '登入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        name: name.value,
        inviteCode: inviteCode.value,
      },
    })
    // Auto login after register
    await signIn('credentials', {
      email: email.value,
      password: password.value,
      redirect: false,
    })
    navigateTo('/chat')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '註冊失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (activeTab.value === 'login') handleLogin()
  else handleRegister()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gray-50">
    <div class="w-full max-w-[400px]">
      <h1 class="text-2xl font-bold text-center mb-6">AI 記帳助手</h1>

      <!-- Tabs -->
      <div class="flex mb-6 border-b">
        <button
          class="flex-1 pb-2 text-center font-medium transition-colors"
          :class="activeTab === 'login' ? 'border-b-2 border-black text-black' : 'text-gray-400'"
          @click="activeTab = 'login'"
        >
          登入
        </button>
        <button
          class="flex-1 pb-2 text-center font-medium transition-colors"
          :class="activeTab === 'register' ? 'border-b-2 border-black text-black' : 'text-gray-400'"
          @click="activeTab = 'register'"
        >
          註冊
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="activeTab === 'register'">
          <label class="block text-sm font-medium mb-1">名稱</label>
          <input
            v-model="name"
            type="text"
            placeholder="你的名稱"
            class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">密碼</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div v-if="activeTab === 'register'">
          <label class="block text-sm font-medium mb-1">邀請碼</label>
          <input
            v-model="inviteCode"
            type="text"
            required
            placeholder="請輸入邀請碼"
            class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {{ loading ? '處理中...' : (activeTab === 'login' ? '登入' : '註冊') }}
        </button>
      </form>
    </div>
  </div>
</template>
