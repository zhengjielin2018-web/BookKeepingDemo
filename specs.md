# AI 記帳助手 - 專案規格書 (Project Specification)

## 📋 專案概述

本專案是一個基於 **Nuxt 4** 的全端 Web 應用程式，利用 **Google Gemini AI** 提供自然語言記帳功能。使用者可以透過對話方式記錄收支、查詢歷史、修改和刪除記錄，系統會自動解析語意並提供視覺化統計。

## 🎯 核心目標

1. **自然語言互動**：使用者使用日常語言即可完成記帳操作，無需學習複雜介面
2. **智能資料處理**：AI 自動解析金額、類別、日期等資訊
3. **安全可靠**：完整的使用者認證與資料隔離
4. **即時統計**：提供多維度的統計查詢與圖表視覺化
5. **響應式設計**：支援桌面與移動裝置

## 🏗️ 技術架構

### 前端架構
- **框架**: Nuxt 4
  - Vue 3 + Composition API
  - `<script setup>` 語法
  - TypeScript 支援
- **樣式**: Tailwind CSS 3.x
- **UI 組件**: Shadcn-Vue (基於 Reka UI/Radix Vue)
- **圖表**: Chart.js 4.x + Vue-ChartJS
- **狀態管理**: Vue 3 Reactivity API (ref, computed, reactive)
- **HTTP 請求**: Nuxt 內建 `$fetch`

### 後端架構
- **伺服器**: Nuxt Server Routes (Nitro)
  - `/server/api/` 目錄下的 API 端點
  - 伺服器端執行，完全隔離敏感資訊
- **資料庫**: PostgreSQL (Vercel Postgres)
- **ORM**: Drizzle ORM
  - 完整 TypeScript 型別支援
  - Migration 管理
  - Query Builder
- **認證**: NuxtAuth (@sidebase/nuxt-auth)
  - Auth.js (NextAuth) 整合
  - Credentials Provider (Email/Password)
  - Drizzle Adapter
- **密碼加密**: bcrypt 6.x
- **AI 引擎**: Google Generative AI SDK
  - Model: gemini-1.5-flash-latest
  - Function Calling 功能

## 📊 資料庫設計

### Schema 概念

使用 Drizzle ORM 定義，位於 `server/database/schema.ts`

#### 1. 使用者相關表格 (Auth.js Schema)

##### users (使用者表)
```typescript
{
  id: UUID (PK, default random)
  name: VARCHAR(255)
  email: VARCHAR(255) (UNIQUE, NOT NULL)
  emailVerified: TIMESTAMP
  image: TEXT
  passwordHash: TEXT (NOT NULL)
  totalPromptTokens: INTEGER (DEFAULT 0)
  totalCompletionTokens: INTEGER (DEFAULT 0)
}
```

##### accounts (第三方帳號關聯)
```typescript
{
  id: UUID (PK)
  userId: UUID (FK -> users.id, CASCADE DELETE)
  type: VARCHAR(255)
  provider: VARCHAR(255)
  providerAccountId: VARCHAR(255)
  refreshToken: TEXT
  accessToken: TEXT
  expiresAt: INTEGER
  tokenType: VARCHAR(255)
  scope: VARCHAR(255)
  idToken: TEXT
  sessionState: VARCHAR(255)
}
```

##### sessions (會話表)
```typescript
{
  id: UUID (PK)
  sessionToken: VARCHAR(255) (UNIQUE, NOT NULL)
  userId: UUID (FK -> users.id, CASCADE DELETE)
  expires: TIMESTAMP (NOT NULL)
}
```

##### verification_tokens (驗證令牌)
```typescript
{
  identifier: VARCHAR(255) (NOT NULL)
  token: VARCHAR(255) (UNIQUE, NOT NULL)
  expires: TIMESTAMP (NOT NULL)
}
```

#### 2. 業務相關表格

##### transactions (交易記錄)
```typescript
{
  id: UUID (PK, default random)
  userId: UUID (FK -> users.id, CASCADE DELETE, NOT NULL)
  amount: INTEGER (NOT NULL)
  type: VARCHAR(10) (NOT NULL) // '收入' | '支出'
  category: VARCHAR(50) (NOT NULL) // 例如：飲食、交通、娛樂
  description: TEXT
  date: DATE (NOT NULL)
  createdAt: TIMESTAMP (DEFAULT NOW)
}

// 索引
INDEX idx_transactions_user_date (userId, date)
INDEX idx_transactions_user_category (userId, category)
```

##### invite_codes (邀請碼表)
```typescript
{
  id: UUID (PK, default random)
  code: VARCHAR(50) (UNIQUE, NOT NULL)
  usedBy: UUID (FK -> users.id, NULLABLE)
  usedAt: TIMESTAMP
  createdAt: TIMESTAMP (DEFAULT NOW)
}
```

## 🔐 認證與授權

### 認證流程

#### 註冊 (POST /api/auth/signup)
1. 驗證邀請碼是否存在且未使用
2. 檢查 Email 是否已註冊
3. 使用 bcrypt 加密密碼 (salt rounds: 10)
4. 建立使用者記錄
5. 標記邀請碼為已使用
6. 回傳成功

#### 登入 (NuxtAuth Credentials Provider)
1. 接收 Email + Password
2. 查詢使用者
3. 驗證密碼 (bcrypt.compare)
4. 建立 Session
5. 回傳 Session Token

#### Session 管理
- 使用 Auth.js Session 機制
- Session 存於資料庫 (sessions 表)
- 前端透過 `useAuth()` composable 取得登入狀態
- 受保護頁面使用 `definePageMeta({ middleware: 'auth' })`

### 授權機制
- 所有 API 呼叫都需驗證 `userId`
- 每個資料查詢都加上 `userId` 條件，確保資料隔離
- 修改/刪除操作都先驗證資料擁有權

## 🤖 AI 功能設計

### Gemini Function Calling

位於 `server/utils/gemini.ts`，定義了 4 個函數供 AI 呼叫：

#### 1. addTransaction (新增交易)
```typescript
{
  name: 'addTransaction',
  parameters: {
    amount: INTEGER (必填)
    type: ENUM('收入', '支出') (必填)
    category: STRING (必填)
    description: STRING (選填)
    date: STRING (YYYY-MM-DD, 必填)
  }
}
```

#### 2. queryTransactions (查詢交易)
```typescript
{
  name: 'queryTransactions',
  parameters: {
    dateFrom: STRING (YYYY-MM-DD, 必填)
    dateTo: STRING (YYYY-MM-DD, 必填)
    category: STRING (選填)
    type: ENUM('收入', '支出') (選填)
    groupBy: ENUM('category', 'date', 'type') (選填)
  }
}
```

#### 3. updateTransaction (修改交易)
```typescript
{
  name: 'updateTransaction',
  parameters: {
    transactionId: STRING (UUID, 必填)
    updates: OBJECT {
      amount?: INTEGER
      type?: ENUM('收入', '支出')
      category?: STRING
      description?: STRING
      date?: STRING (YYYY-MM-DD)
    }
  }
}
```

#### 4. deleteTransaction (刪除交易)
```typescript
{
  name: 'deleteTransaction',
  parameters: {
    transactionId: STRING (UUID, 必填)
  }
}
```

### AI 對話流程

1. **使用者輸入** → 前端送至 `POST /api/chat`
2. **後端驗證** → 檢查 Session，取得 userId
3. **呼叫 Gemini** → 傳送訊息 + Function Declarations
4. **AI 解析** → 判斷使用者意圖，決定呼叫哪個函數
5. **函數執行** → 後端執行對應的資料庫操作
6. **結果回傳** → AI 生成自然語言回覆
7. **圖表生成** → 若是統計查詢，自動生成圖表設定
8. **Token 記錄** → 更新使用者的 AI Token 使用量

### 圖表自動生成

當查詢結果包含分組統計時，AI 會自動生成圖表配置：

```typescript
{
  type: 'bar' | 'pie' | 'line',
  title: string,
  labels: string[],
  datasets: [{
    label: string,
    data: number[],
    backgroundColor?: string[]
  }]
}
```

## 📱 前端功能

### 頁面結構

#### 1. 首頁 (/) - `app/pages/index.vue`
- **用途**: Landing Page，介紹產品功能
- **內容**:
  - Hero Section (產品標題 + 描述)
  - Demo 對話展示
  - CTA 按鈕 (登入/開始使用)
- **狀態**: 未登入顯示「登入」，已登入顯示「開始記帳」

#### 2. 登入/註冊頁 (/login) - `app/pages/login.vue`
- **用途**: 使用者認證
- **Tab 切換**: 登入 / 註冊
- **登入表單**:
  - Email
  - Password
- **註冊表單**:
  - Name
  - Email
  - Password
  - Invite Code
- **錯誤處理**: 顯示錯誤訊息
- **自動登入**: 註冊成功後自動登入

#### 3. 記帳對話頁 (/chat) - `app/pages/chat.vue`
- **用途**: 主要功能頁面
- **中間件**: 需要登入 (`middleware: 'auth'`)
- **Header**: 標題 + 使用者選單
- **訊息列表**: 顯示對話歷史
  - 使用者訊息 (右側，黑底白字)
  - AI 回覆 (左側，灰底)
  - 圖表顯示 (當有圖表資料時)
- **輸入框**: 底部固定輸入區域
- **載入狀態**: 顯示載入動畫
- **Debug Panel**: 開發時除錯資訊 (可隱藏)

### 核心組件

#### ChatMessageList.vue
- 顯示所有對話訊息
- 自動捲動到最新訊息
- 支援圖表嵌入

#### ChatBubble.vue
- 單一訊息氣泡
- 區分使用者/AI 訊息
- 支援 Markdown (選用)

#### ChatChart.vue
- 圖表顯示組件
- 使用 vue-chartjs
- 支援 Bar / Pie / Line 圖表

#### ChatInput.vue
- 訊息輸入框
- 送出按鈕
- 載入狀態禁用

#### UserMenu.vue
- 下拉選單
- 顯示使用者名稱/Email
- 登出功能

#### DebugPanel.vue
- 開發除錯面板
- 顯示 API Logs
- 可展開/收合

### UI 設計規範

- **色彩**:
  - 主色: 黑色 (#000000)
  - 使用者訊息: 黑底白字
  - AI 訊息: 灰底 (bg-gray-100)
  - 按鈕 hover: gray-800
- **字體**: 系統預設字體
- **圓角**: 
  - 按鈕: rounded-md
  - 訊息氣泡: rounded-2xl (對話方向角較小)
- **間距**: Tailwind 預設間距系統
- **響應式**: 使用 Tailwind 響應式工具類

## 🔌 API 設計

### POST /api/chat
**用途**: 處理使用者對話訊息

**請求 Body**:
```json
{
  "message": "今天午餐吃拉麵花了 200 元"
}
```

**回應**:
```json
{
  "reply": "已記錄：今天飲食支出 200 元（拉麵）🍜",
  "chart": {
    "type": "bar",
    "title": "本月飲食支出統計",
    "labels": ["拉麵", "咖啡", "便當"],
    "datasets": [{
      "label": "金額",
      "data": [200, 150, 120]
    }]
  }
}
```

**錯誤處理**:
- 401: 未登入
- 400: 訊息格式錯誤
- 500: 伺服器錯誤 (AI 呼叫失敗)

### POST /api/auth/signup
**用途**: 使用者註冊

**請求 Body**:
```json
{
  "name": "張三",
  "email": "test@example.com",
  "password": "password123",
  "inviteCode": "DEMO2024"
}
```

**回應**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "張三",
    "email": "test@example.com"
  }
}
```

**錯誤處理**:
- 400: 邀請碼無效或已使用
- 409: Email 已註冊

### POST /api/auth/[...] (Auth.js)
**用途**: Auth.js 預設端點
- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/session`
- `/api/auth/csrf`
- 等等

### GET /api/debug/logs (開發用)
**用途**: 取得除錯日誌

**回應**:
```json
{
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "level": "INFO",
      "category": "AI",
      "message": "Function called",
      "data": {...}
    }
  ]
}
```

## ⚙️ 環境變數

### 必要變數

```bash
# 資料庫連線字串
POSTGRES_URL=postgresql://user:password@host:5432/database

# Google Gemini API Key
GEMINI_API_KEY=AIzaSy...

# Auth.js Secret (用於加密 Session)
AUTH_SECRET=random_secret_string_32_chars

# Next Auth URL (部署時需設定為實際網址)
NEXTAUTH_URL=https://yourdomain.com
```

### 開發環境預設值

- `NEXTAUTH_URL`: 預設 `http://localhost:3000`
- 其他變數無預設值，必須設定

## 🚀 部署流程

### Vercel 部署 (推薦)

1. **準備資料庫**:
   - 在 Vercel Dashboard 建立 Postgres 資料庫
   - 取得 `POSTGRES_URL` 連線字串

2. **設定環境變數**:
   - 在 Vercel 專案設定中新增所有必要環境變數

3. **初始化資料庫**:
   ```bash
   npx drizzle-kit push
   ```

4. **新增邀請碼** (選用):
   ```sql
   INSERT INTO invite_codes (code) VALUES ('YOUR_CODE');
   ```

5. **連接 GitHub**:
   - Vercel 自動偵測 Nuxt 專案
   - 自動執行 `npm run build`
   - 自動部署

6. **驗證部署**:
   - 測試登入/註冊功能
   - 測試記帳對話功能
   - 檢查資料是否正確儲存

### 手動部署 (其他平台)

```bash
# 1. 建置
npm run build

# 2. 啟動
npm run preview
# 或使用 PM2
pm2 start .output/server/index.mjs
```

## 📈 效能考量

### 前端效能
- **程式碼分割**: Nuxt 自動分割
- **懶載入**: 組件按需載入
- **快取**: 靜態資源自動快取

### 後端效能
- **資料庫索引**: 
  - `transactions` 表建立複合索引
  - 查詢時善用索引
- **Connection Pooling**: 使用 Vercel Postgres 內建連線池
- **AI 呼叫**: 使用 Flash 模型，回應速度快

### 安全性考量
- **SQL 注入**: 使用 Drizzle ORM 參數化查詢
- **XSS**: Vue 自動轉義
- **CSRF**: Auth.js 內建保護
- **密碼**: bcrypt 加密 (cost: 10)
- **Session**: HTTP-only Cookie
- **API Key**: 僅在伺服器端使用

## 🧪 測試策略

### 建議測試項目

1. **單元測試**:
   - Utility 函數
   - Gemini Function Calling 解析

2. **整合測試**:
   - API 端點
   - 資料庫操作
   - 認證流程

3. **E2E 測試**:
   - 註冊/登入流程
   - 記帳對話流程
   - 查詢統計流程

### 測試工具建議
- Vitest (單元測試)
- Playwright (E2E 測試)

## 📝 開發規範

### Git Commit 規範
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 程式碼格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 工具配置

### 程式碼風格
- 使用 ESLint + Prettier
- TypeScript Strict Mode
- 使用 Composition API
- 優先使用 `<script setup>`

## 🔄 未來擴充方向

### 短期目標
- [ ] 預算管理功能
- [ ] 多幣別支援
- [ ] 匯出 CSV/PDF 報表
- [ ] 多種圖表類型
- [ ] 行動版 APP (PWA)

### 中期目標
- [ ] 多人協作記帳
- [ ] 重複交易模板
- [ ] 智能提醒通知
- [ ] AI 理財建議
- [ ] 整合銀行 API

### 長期目標
- [ ] 投資追蹤
- [ ] 資產管理
- [ ] 稅務規劃
- [ ] 多語系支援

## 📚 參考資源

- [Nuxt 4 Documentation](https://nuxt.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Google Gemini API Documentation](https://ai.google.dev/)
- [NuxtAuth Documentation](https://sidebase.io/nuxt-auth)
- [Shadcn-Vue Documentation](https://www.shadcn-vue.com/)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)

## 📞 支援與聯繫

如有問題或建議，請透過以下方式聯繫：
- GitHub Issues: [提交 Issue](https://github.com/zhengjielin2018-web/BookKeepingDemo/issues)
- Email: (請提供聯繫信箱)

---

**版本**: 1.0.0  
**最後更新**: 2024-04-03  
**維護者**: zhengjielin2018-web
