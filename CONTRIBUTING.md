# 貢獻指南 (Contributing Guide)

感謝您考慮為 AI 記帳助手專案做出貢獻！本文件提供了參與專案的指南和最佳實踐。

## 📋 目錄

- [行為準則](#行為準則)
- [如何貢獻](#如何貢獻)
- [開發流程](#開發流程)
- [程式碼規範](#程式碼規範)
- [提交指南](#提交指南)
- [問題回報](#問題回報)

## 行為準則

### 我們的承諾

為了營造一個開放且友善的環境，我們承諾：

- 使用友善和包容的語言
- 尊重不同的觀點和經驗
- 優雅地接受建設性批評
- 專注於對社群最有利的事情
- 對其他社群成員展現同理心

## 如何貢獻

### 回報 Bug

如果您發現了 Bug，請：

1. 確認 Bug 尚未被回報
2. 在 [Issues](https://github.com/zhengjielin2018-web/BookKeepingDemo/issues) 建立新的 Issue
3. 使用清晰的標題描述問題
4. 提供詳細的重現步驟
5. 說明預期行為和實際行為
6. 如果可能，提供截圖或錯誤訊息

### 建議新功能

如果您有功能建議，請：

1. 確認該功能尚未被提議
2. 在 Issues 建立新的 Feature Request
3. 清楚說明功能需求和使用場景
4. 如果可能，提供實作想法

### 提交 Pull Request

1. Fork 專案到您的帳號
2. 從 `main` 建立新的 feature branch
3. 進行您的修改
4. 確保程式碼符合規範
5. 提交 Pull Request

## 開發流程

### 1. 設定開發環境

```bash
# Clone repository
git clone https://github.com/zhengjielin2018-web/BookKeepingDemo.git
cd BookKeepingDemo

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# 編輯 .env 填入您的環境變數

# Initialize database
npx drizzle-kit push

# Start development server
npm run dev
```

### 2. 建立 Feature Branch

```bash
# 從 main 建立新分支
git checkout -b feature/your-feature-name

# 或修復 bug
git checkout -b fix/bug-description
```

### 3. 進行開發

- 遵循專案的程式碼規範
- 撰寫清晰的註解 (必要時)
- 新增或更新測試 (如果有測試)
- 更新文檔 (如果有 API 變更)

### 4. 測試您的修改

```bash
# 執行開發伺服器測試
npm run dev

# 建置測試
npm run build

# 如果有測試套件
npm test
```

### 5. 提交變更

```bash
# 檢查變更
git status
git diff

# 暫存變更
git add .

# 提交 (遵循 Commit 規範)
git commit -m "feat: add new feature"

# 推送到您的 Fork
git push origin feature/your-feature-name
```

### 6. 建立 Pull Request

1. 前往 GitHub 上的原始 repository
2. 點擊 "New Pull Request"
3. 選擇您的 branch
4. 填寫 PR 描述:
   - 說明變更內容
   - 關聯相關 Issue
   - 列出測試步驟
5. 提交 PR 等待審核

## 程式碼規範

### TypeScript

```typescript
// ✅ 好的寫法
interface User {
  id: string
  name: string
  email: string
}

async function fetchUser(id: string): Promise<User> {
  // ...
}

// ❌ 避免
function fetchUser(id: any): any {
  // ...
}
```

### Vue 組件

```vue
<!-- ✅ 使用 Composition API + script setup -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
</script>

<template>
  <div>{{ count }} x 2 = {{ double }}</div>
</template>
```

### API 設計

```typescript
// ✅ 清楚的錯誤處理
export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: '請先登入' 
    })
  }
  
  // ...
})
```

### 命名規範

- **檔案名稱**: 
  - 組件: `PascalCase.vue` (例如: `ChatBubble.vue`)
  - 工具函數: `camelCase.ts` (例如: `formatDate.ts`)
  - API 路由: `kebab-case.ts` (例如: `user-profile.get.ts`)

- **變數/函數**: `camelCase`
  ```typescript
  const userName = 'John'
  function getUserById(id: string) { }
  ```

- **型別/介面**: `PascalCase`
  ```typescript
  interface UserProfile { }
  type ResponseData = { }
  ```

- **常數**: `UPPER_SNAKE_CASE`
  ```typescript
  const MAX_RETRY_COUNT = 3
  const API_BASE_URL = 'https://api.example.com'
  ```

## 提交指南

### Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類型

- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 程式碼格式調整 (不影響功能)
- `refactor`: 重構 (不是新功能也不是 bug 修復)
- `perf`: 效能優化
- `test`: 新增或修改測試
- `chore`: 建置工具或輔助工具變動

### 範例

```bash
# 新功能
git commit -m "feat: add export to CSV feature"
git commit -m "feat(chat): add message editing capability"

# Bug 修復
git commit -m "fix: resolve login session timeout issue"
git commit -m "fix(api): handle null transaction amount"

# 文檔
git commit -m "docs: update README with deployment guide"
git commit -m "docs: add API documentation"

# 重構
git commit -m "refactor: simplify transaction query logic"
git commit -m "refactor(ui): extract reusable button component"
```

### Commit 最佳實踐

- 每個 commit 只做一件事
- 寫清楚的 commit message
- 避免過大的 commit
- 提交前先測試
- 不要提交不完整的功能

## 問題回報

### Bug Report 模板

```markdown
**Bug 描述**
簡短描述 bug 是什麼

**重現步驟**
1. 前往 '...'
2. 點擊 '...'
3. 捲動到 '...'
4. 看到錯誤

**預期行為**
應該發生什麼

**實際行為**
實際發生什麼

**截圖**
如果適用，請新增截圖

**環境**
- OS: [例如: Windows 11]
- Browser: [例如: Chrome 120]
- Node 版本: [例如: 18.17.0]

**其他資訊**
任何其他相關資訊
```

### Feature Request 模板

```markdown
**功能描述**
清楚簡潔地描述您想要的功能

**使用場景**
為什麼需要這個功能？它能解決什麼問題？

**建議實作方式**
如果您有實作想法，請描述

**替代方案**
您考慮過的其他解決方案

**其他資訊**
任何其他相關資訊或截圖
```

## 審核流程

### Pull Request 檢查清單

提交 PR 前，請確認：

- [ ] 程式碼遵循專案規範
- [ ] Commit message 符合規範
- [ ] 已測試所有修改
- [ ] 更新相關文檔
- [ ] 沒有引入新的警告或錯誤
- [ ] 通過所有測試 (如有)
- [ ] PR 描述清楚說明變更內容

### 審核標準

審核者會檢查：

1. **功能正確性**: 是否符合需求
2. **程式碼品質**: 是否易讀、易維護
3. **效能**: 是否有效能問題
4. **安全性**: 是否有安全漏洞
5. **測試覆蓋**: 是否有充分測試
6. **文檔**: 是否更新相關文檔

## 常見問題

### Q: 我該從哪裡開始？

A: 可以從以下開始：
- 查看標記為 `good first issue` 的 Issues
- 改善文檔
- 修復小 bug
- 新增測試

### Q: 我的 PR 多久會被審核？

A: 通常在 1-3 個工作天內會有回應，請耐心等待。

### Q: 如果我的 PR 被要求修改？

A: 這很正常！根據審核意見修改後，推送到同一個 branch 即可。

### Q: 我可以同時進行多個 PR 嗎？

A: 可以，但建議一次專注於一個功能或修復。

## 獲得幫助

如果您有任何問題：

- 查看 [README.md](./README.md)
- 查看 [專案規格書](./specs.md)
- 在 Issues 提問
- 聯繫維護者

## 致謝

感謝所有貢獻者！您的參與讓這個專案變得更好。

---

再次感謝您的貢獻！🎉
