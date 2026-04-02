<!-- app/pages/index.vue -->
<script setup lang="ts">
const { status } = useAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b bg-white px-4 py-3 flex items-center justify-between">
      <h1 class="text-xl font-bold">AI 記帳助手</h1>
      <NuxtLink
        v-if="status !== 'authenticated'"
        to="/login"
        class="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
      >
        登入
      </NuxtLink>
      <NuxtLink
        v-else
        to="/chat"
        class="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
      >
        開始記帳
      </NuxtLink>
    </header>

    <!-- Hero -->
    <main class="flex-1 flex items-center justify-center px-4">
      <div class="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        <!-- Left: text -->
        <div>
          <h2 class="text-4xl font-bold mb-4">
            用說的就能記帳
          </h2>
          <p class="text-lg text-gray-600 mb-6">
            告訴 AI 你花了什麼錢，它會自動幫你分類、記錄、統計。
            想知道這個月花了多少？直接問就好。
          </p>
          <div class="flex gap-3">
            <NuxtLink
              to="/login"
              class="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 w-full md:w-auto text-center"
            >
              免費開始使用
            </NuxtLink>
          </div>
        </div>

        <!-- Right: demo conversation -->
        <div class="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div class="flex justify-end">
            <div class="bg-black text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs">
              今天午餐吃拉麵花了 200 元
            </div>
          </div>
          <div class="flex justify-start">
            <div class="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs">
              已記錄：今天飲食支出 200 元（拉麵）🍜
            </div>
          </div>
          <div class="flex justify-end">
            <div class="bg-black text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs">
              這個月餐費花多少？
            </div>
          </div>
          <div class="flex justify-start">
            <div class="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs">
              您這個月的飲食總花費為 3,200 元，共 15 筆。
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
