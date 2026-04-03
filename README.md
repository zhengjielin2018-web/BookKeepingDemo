# AI 記帳助手 (BookKeepingDemo)

> 🤖 用自然語言對話來記帳的智能財務管理應用

一個基於 Nuxt 4 和 Google Gemini AI 的全端記帳應用，讓使用者透過自然語言對話輕鬆記錄收支、查詢統計，並自動生成視覺化圖表。

## ✨ 主要功能

- 🗣️ **自然語言記帳**：用說的就能記錄收支，AI 自動解析金額、類別和日期
- 📊 **智能查詢統計**：直接問「這個月餐費花多少？」，AI 會自動計算並回覆
- 📈 **視覺化圖表**：自動生成長條圖、圓餅圖等統計圖表
- 🔐 **用戶認證系統**：安全的 Email/密碼登入註冊
- 🎯 **邀請碼機制**：支援邀請碼註冊控管
- 💾 **永久資料儲存**：使用 PostgreSQL 資料庫永久保存記帳資料
- 🔄 **CRUD 完整支援**：新增、查詢、修改、刪除交易記錄
- 📱 **響應式設計**：支援桌面和移動設備

## 🛠️ 技術架構

### 前端技術
- **框架**: [Nuxt 4](https://nuxt.com/) (Vue 3 + Composition API)
- **UI 框架**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 組件**: [Shadcn-Vue](https://www.shadcn-vue.com/) (基於 Radix UI)
- **圖表**: [Chart.js](https://www.chartjs.org/) + Vue-ChartJS
- **狀態管理**: Vue 3 Composition API
- **Icons**: [Lucide Vue Next](https://lucide.dev/)

### 後端技術
- **伺服器**: Nuxt Server Routes (Nitro Engine)
- **資料庫**: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) / PostgreSQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **認證**: [NuxtAuth](https://sidebase.io/nuxt-auth) (Auth.js + Credentials Provider)
- **密碼加密**: bcrypt
- **AI 引擎**: [Google Gemini API](https://ai.google.dev/) (gemini-3.1-flash-lite-preview)

### 開發工具
- **TypeScript**: 完整的類型支援
- **Drizzle Kit**: 資料庫 Migration 工具
- **ESLint & Prettier**: 代碼規範

## 📋 系統需求

- Node.js 18.x 或更高版本
- PostgreSQL 資料庫 (或 Vercel Postgres)
- Google Gemini API Key

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數設定

在專案根目錄創建 `.env` 檔案：

```env
# 資料庫連線 (Vercel Postgres 或 PostgreSQL)
POSTGRES_URL=postgresql://user:password@host:5432/database

# Google Gemini API Key (從 https://ai.google.dev/ 取得)
GEMINI_API_KEY=your_gemini_api_key

# Auth.js Secret (可用 openssl rand -base64 32 生成)
AUTH_SECRET=your_random_secret_string

# Next Auth URL (本地開發用)
NEXTAUTH_URL=http://localhost:3000
```

### 3. 資料庫初始化

執行 Drizzle 生成資料表結構：

```bash
# 推送資料表結構到資料庫
npx drizzle-kit push
```

### 4. 創建邀請碼 (選用)

如果需要邀請碼註冊機制，需手動在資料庫新增邀請碼：

```sql
INSERT INTO invite_codes (code) VALUES ('DEMO2024');
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

應用將在 `http://localhost:3000` 啟動。

## 📖 使用說明

### 基本對話範例

**記錄支出：**
```
使用者: 今天午餐吃拉麵花了 200 元
AI: 已記錄：今天飲食支出 200 元（拉麵）🍜
```

**查詢統計：**
```
使用者: 這個月餐費花多少？
AI: 您這個月的飲食總花費為 3,200 元，共 15 筆。
```

**修改記錄：**
```
使用者: 把昨天的拉麵改成 250 元
AI: 已修改：昨天的飲食支出已更新為 250 元
```

**刪除記錄：**
```
使用者: 刪除今天的咖啡記錄
AI: 已刪除：今天的咖啡支出記錄
```

## 🗄️ 資料庫結構

### 主要資料表

#### users (使用者)
- `id`: UUID (主鍵)
- `name`: 使用者名稱
- `email`: Email (唯一)
- `passwordHash`: 加密密碼
- `totalPromptTokens`: AI Token 使用統計
- `totalCompletionTokens`: AI Token 使用統計

#### transactions (交易記錄)
- `id`: UUID (主鍵)
- `userId`: 使用者 ID (外鍵)
- `amount`: 金額
- `type`: 類型 (收入/支出)
- `category`: 類別 (飲食/交通/娛樂等)
- `description`: 描述
- `date`: 交易日期
- `createdAt`: 建立時間

#### invite_codes (邀請碼)
- `id`: UUID (主鍵)
- `code`: 邀請碼 (唯一)
- `usedBy`: 使用者 ID
- `usedAt`: 使用時間
- `createdAt`: 建立時間

## 🏗️ 專案結構

```
BookKeepingDemo/
├── app/                      # 前端應用
│   ├── components/          # Vue 組件
│   │   ├── ui/             # UI 組件 (Shadcn)
│   │   ├── ChatBubble.vue  # 聊天氣泡
│   │   ├── ChatInput.vue   # 輸入框
│   │   ├── ChatMessageList.vue  # 訊息列表
│   │   ├── ChatChart.vue   # 圖表組件
│   │   └── UserMenu.vue    # 使用者選單
│   ├── pages/              # 頁面路由
│   │   ├── index.vue       # 首頁 (Landing Page)
│   │   ├── login.vue       # 登入/註冊頁
│   │   └── chat.vue        # 記帳對話頁
│   ├── layouts/            # 佈局
│   ├── middleware/         # 路由中間件
│   │   └── auth.ts         # 認證中間件
│   └── lib/                # 工具函數
├── server/                  # 後端 API
│   ├── api/                # API 路由
│   │   ├── chat.post.ts    # 聊天 API
│   │   ├── auth/           # 認證相關 API
│   │   └── debug/          # 除錯 API
│   ├── database/           # 資料庫
│   │   └── schema.ts       # Drizzle Schema
│   └── utils/              # 工具函數
│       ├── db.ts           # 資料庫連線
│       ├── gemini.ts       # Gemini AI 整合
│       ├── auth.ts         # 認證設定
│       └── logger.ts       # 日誌工具
├── public/                  # 靜態資源
├── docs/                    # 文檔
├── nuxt.config.ts          # Nuxt 設定
├── drizzle.config.ts       # Drizzle 設定
├── tailwind.config.ts      # Tailwind 設定
└── package.json            # 專案依賴
```

## 🔧 可用指令

```bash
# 開發
npm run dev              # 啟動開發伺服器

# 建置
npm run build            # 建置生產版本
npm run preview          # 預覽生產版本

# 資料庫
npx drizzle-kit push     # 推送 Schema 到資料庫
npx drizzle-kit studio   # 開啟 Drizzle Studio (資料庫 GUI)
npx drizzle-kit generate # 生成 Migration 檔案
```

## 🚢 部署

### Vercel (推薦)

1. 連接 GitHub 倉庫到 Vercel
2. 在 Vercel 專案設定中新增環境變數：
   - `POSTGRES_URL`
   - `GEMINI_API_KEY`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`
3. 部署會自動執行

### 其他平台

本專案使用 Nuxt 4，支援多種部署平台：
- Netlify
- Cloudflare Pages
- AWS Lambda
- Docker

詳見 [Nuxt 部署文檔](https://nuxt.com/docs/getting-started/deployment)

## 🔐 安全性

- ✅ 所有 API 密鑰存放在伺服器端
- ✅ 密碼使用 bcrypt 加密
- ✅ Session 使用 Auth.js 管理
- ✅ SQL 注入防護 (Drizzle ORM)
- ✅ XSS 防護 (Vue 自動轉義)
- ✅ 使用者資料隔離 (每個 API 都驗證 userId)

## 🎯 AI 功能說明

### Function Calling

Gemini AI 透過 Function Calling 機制，將使用者的自然語言轉換為結構化操作：

1. **addTransaction**: 新增交易記錄
2. **queryTransactions**: 查詢交易記錄
3. **updateTransaction**: 修改交易記錄
4. **deleteTransaction**: 刪除交易記錄

### 智能特性

- 自動判斷使用者意圖 (新增/查詢/修改/刪除)
- 自動解析金額、類別、日期
- 自動生成圖表 (當查詢有分組統計時)
- 模糊匹配類別名稱
- 上下文理解 (例如「昨天」「這個月」)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 👨‍💻 作者

zhengjielin2018-web

## 🔗 相關連結

- [Nuxt 4 文檔](https://nuxt.com/)
- [Drizzle ORM 文檔](https://orm.drizzle.team/)
- [Google Gemini API 文檔](https://ai.google.dev/)
- [Shadcn-Vue 文檔](https://www.shadcn-vue.com/)
- [Vercel Postgres 文檔](https://vercel.com/docs/storage/vercel-postgres)
