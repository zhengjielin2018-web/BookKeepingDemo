# AI 記帳助手 (BookKeepingDemo)

[![CI](https://github.com/zhengjielin2018-web/BookKeepingDemo/actions/workflows/ci.yml/badge.svg)](https://github.com/zhengjielin2018-web/BookKeepingDemo/actions/workflows/ci.yml)

> 🤖 用自然語言對話來記帳的智能財務管理應用

一個基於 Nuxt 4 和 Google Gemini AI 的全端記帳應用，讓使用者透過自然語言對話輕鬆記錄收支、查詢統計，並自動生成視覺化圖表。

## ✨ 主要功能

- 🗣️ **自然語言記帳**：用說的就能記錄收支，AI 自動解析金額、類別和日期
- 📊 **智能查詢統計**：直接問「這個月餐費花多少？」，AI 會自動計算並回覆
- 📈 **視覺化圖表**：自動生成長條圖、圓餅圖、折線圖
- 💬 **多輪對話記憶**：保留最近 20 則訊息的滑動視窗，聽得懂「那筆改成 250」
- 🔐 **用戶認證系統**：Email／密碼登入註冊，bcrypt 雜湊、JWT session
- 🎯 **邀請碼機制**：註冊必須持有未使用的邀請碼
- 💾 **永久資料儲存**：PostgreSQL（正式環境為 Neon serverless）
- 🔄 **CRUD 完整支援**：新增、查詢、修改、刪除交易記錄，皆經擁有權驗證
- 🐞 **開發用即時日誌**：開發模式下的 SSE 除錯面板，可即時看到 AI 與資料庫的動作
- 📱 **響應式設計**：支援桌面和移動設備

## 🛠️ 技術架構

### 前端

- **框架**：[Nuxt 4](https://nuxt.com/)（Vue 3 + Composition API）
- **UI 框架**：[Tailwind CSS](https://tailwindcss.com/) 3
- **UI 組件**：[shadcn-vue](https://www.shadcn-vue.com/)（底層為 [Reka UI](https://reka-ui.com/)）
- **圖表**：[Chart.js](https://www.chartjs.org/) 4 + vue-chartjs
- **Icons**：[Lucide Vue Next](https://lucide.dev/)

### 後端

- **伺服器**：Nuxt Server Routes（Nitro）
- **資料庫**：PostgreSQL 16；正式環境使用 [Neon](https://neon.tech/) serverless Postgres
- **資料庫連線**：`@neondatabase/serverless` 的 **HTTP driver** + `drizzle-orm/neon-http`
- **ORM**：[Drizzle ORM](https://orm.drizzle.team/)
- **Migration**：drizzle-kit
- **認證**：[NuxtAuth](https://sidebase.io/nuxt-auth)（Auth.js / next-auth，Credentials Provider，JWT session）
- **密碼雜湊**：bcrypt（cost 10）
- **AI 引擎**：[Google Gemini API](https://ai.google.dev/)（`gemini-3.1-flash-lite-preview`，Function Calling）

### 品質

- **TypeScript**：全專案型別支援
- **CI**：GitHub Actions 三個 job — 建置、資料庫 migration 與 schema 驗證、schema drift 檢查（見 [CI](#-ci)）

> 目前**尚未**導入 ESLint / Prettier 與單元測試框架。品質防線只有上面那條 CI。

## 📋 系統需求

- **Node.js** 20.19+ 或 22.12+（Nuxt 4 需求；開發環境使用 22.x）
- **npm**（本專案以 npm 為準，`package-lock.json` 已提交；請勿混用 pnpm/yarn）
- **PostgreSQL 13+**（需要內建的 `gen_random_uuid()`），或 Neon / Vercel Postgres 等託管服務
- **Google Gemini API Key**

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm ci        # 依 package-lock.json 精確安裝（推薦）
# 或 npm install
```

### 2. 環境變數設定

在專案根目錄建立 `.env`（完整說明見 [`.env.example`](.env.example)）：

```env
# 資料庫連線
POSTGRES_URL=postgresql://user:password@host:5432/database

# Google Gemini API Key（從 https://ai.google.dev/ 取得）
GEMINI_API_KEY=your_gemini_api_key

# Auth.js Secret（可用 openssl rand -base64 32 生成）
AUTH_SECRET=your_random_secret_string

# Auth.js 的對外網址（本地開發用）
NEXTAUTH_URL=http://localhost:3000
```

### 3. 建立資料表

```bash
npx drizzle-kit migrate     # 套用 server/database/migrations 底下的 SQL
```

> `migrate` 和 `push` 的差別、以及為什麼正式環境不要用 `push`，見
> [`docs/database-design.md` §5](docs/database-design.md#5-migration)。

### 4. 建立邀請碼（**必要**）

註冊時**一定**要帶一組未使用的邀請碼，否則 API 會回 400。至少先塞一組進去：

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

完整的設計理由、取捨與已知限制寫在 **[`docs/database-design.md`](docs/database-design.md)**。以下是速覽。

共 6 張表：`transactions`、`invite_codes` 是業務表；`users`、`accounts`、`sessions`、`verification_tokens` 由 `@auth/drizzle-adapter` 要求存在（後三張目前是空的，因為現在只用帳密登入 + JWT session）。

### transactions（交易記錄，核心表）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` FK → `users.id` | `NOT NULL`，`ON DELETE CASCADE` |
| `amount` | `integer` | `NOT NULL`，單位為「元」，不支援小數 |
| `type` | `varchar(10)` | `NOT NULL`，`收入` / `支出` |
| `category` | `varchar(50)` | `NOT NULL`，AI 生成，未做成 lookup 表 |
| `description` | `text` | 備註 |
| `date` | `date` | `NOT NULL`，業務日期（無時區） |
| `created_at` | `timestamp` | 預設 `now()`，系統寫入時間 |

**索引**（順序有意義，`user_id` 必須在最前面）：

- `idx_transactions_user_date` on `(user_id, date)`
- `idx_transactions_user_category` on `(user_id, category)`

### users（使用者）

`id` (uuid PK)、`email` (unique, NOT NULL)、`password_hash` (NOT NULL)、`name`、`email_verified`、`image`、`total_prompt_tokens`、`total_completion_tokens`（AI token 累計，以 `SET col = col + n` 原子累加）。

### invite_codes（邀請碼）

`id` (uuid PK)、`code` (unique, NOT NULL)、`used_by` (FK → `users.id`，**`ON DELETE NO ACTION`**)、`used_at`、`created_at`。

`used_by` 刻意不使用 CASCADE：邀請碼是稽核紀錄，資料庫會拒絕刪除已使用邀請碼的使用者。理由見 [設計文件 §2.5](docs/database-design.md#25-外鍵的刪除行為三條-cascade一條-no-action)。

## 🏗️ 專案結構

```
BookKeepingDemo/
├── .github/
│   ├── workflows/ci.yml         # CI：build / database / schema-drift
│   └── sql/
│       ├── schema-assertions.sql   # 驗證資料庫結構
│       └── behaviour-checks.sql    # 驗證資料庫行為
├── app/                         # 前端應用
│   ├── components/
│   │   ├── ui/                  # shadcn-vue 組件
│   │   ├── ChatBubble.vue
│   │   ├── ChatInput.vue
│   │   ├── ChatMessageList.vue
│   │   ├── ChatChart.vue        # Chart.js 圖表
│   │   ├── DebugPanel.vue       # 開發用即時日誌面板
│   │   └── UserMenu.vue
│   ├── pages/
│   │   ├── index.vue            # 首頁
│   │   ├── login.vue            # 登入 / 註冊
│   │   └── chat.vue             # 記帳對話頁
│   ├── layouts/
│   ├── middleware/auth.ts       # 路由認證中間件
│   └── lib/utils.ts
├── server/
│   ├── api/
│   │   ├── chat.post.ts         # 聊天 API，所有業務查詢都在這裡
│   │   ├── auth/
│   │   │   ├── [...].ts         # Auth.js handler
│   │   │   └── signup.post.ts   # 註冊（含邀請碼驗證）
│   │   └── debug/logs.get.ts    # SSE 日誌串流（production 回 404）
│   ├── database/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── migrations/          # drizzle-kit 產生的 SQL 與快照
│   └── utils/
│       ├── db.ts                # Drizzle + Neon HTTP driver
│       ├── gemini.ts            # Gemini function calling
│       ├── auth.ts              # Auth.js 設定
│       └── logger.ts            # EventEmitter 日誌
├── docs/
│   ├── database-design.md       # 資料庫設計說明
│   └── superpowers/             # 原始規格與計畫
├── public/
├── nuxt.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
└── package.json
```

## 🔧 可用指令

```bash
# 開發
npm run dev                 # 啟動開發伺服器
npm run build               # 建置生產版本
npm run preview             # 預覽生產版本

# 資料庫
npx drizzle-kit generate    # 改完 schema.ts 後產生 migration SQL
npx drizzle-kit migrate     # 套用尚未執行的 migration（部署 / CI 用這個）
npx drizzle-kit push        # 直接同步 schema 到資料庫（只在本機實驗時用）
npx drizzle-kit studio      # 開啟 Drizzle Studio 資料庫 GUI
```

## ✅ CI

`.github/workflows/ci.yml`，push 到 `main` 與 PR 時觸發，三個 job：

| Job | 做什麼 |
|---|---|
| **build** | `npm ci` → `nuxt build`，並上傳 `.output` 產物 |
| **database** | 起一個真的 `postgres:16` container → `drizzle-kit migrate` → 跑結構斷言與行為斷言 → 重跑 migration 確認 no-op |
| **schema-drift** | 跑 `drizzle-kit generate`，若產生新的 migration 檔就讓 CI 紅（代表 `schema.ts` 改了卻沒出 migration） |

`database` job 驗的東西包含：6 張表存在、2 條索引且**欄位順序正確**、4 條外鍵且刪除行為符合設計、4 條唯一約束、關鍵欄位 NOT NULL；行為面則驗證重複 email 被擋、孤兒交易被擋、多租戶資料隔離有效、聚合結果正確、查詢計畫**真的**走到索引、CASCADE 真的連動刪除。

在本機重現 `database` job：

```bash
docker run -d --name bk-pg -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci \
  -e POSTGRES_DB=bookkeeping_ci -p 55432:5432 postgres:16

POSTGRES_URL="postgresql://ci:ci@localhost:55432/bookkeeping_ci" npx drizzle-kit migrate

docker cp .github/sql/. bk-pg:/tmp/
docker exec bk-pg psql "postgresql://ci:ci@localhost:5432/bookkeeping_ci" \
  -v ON_ERROR_STOP=1 -f /tmp/schema-assertions.sql
docker exec bk-pg psql "postgresql://ci:ci@localhost:5432/bookkeeping_ci" \
  -v ON_ERROR_STOP=1 -f /tmp/behaviour-checks.sql

docker rm -f bk-pg
```

## 🚢 部署

### Vercel

1. 連接 GitHub 倉庫到 Vercel
2. 在專案設定新增環境變數：`POSTGRES_URL`、`GEMINI_API_KEY`、`AUTH_SECRET`、`NEXTAUTH_URL`
3. **部署後需自行執行 `npx drizzle-kit migrate`**，Vercel 的建置流程不會自動跑 migration

### 其他平台

Nuxt 4 支援 Netlify、Cloudflare Pages、AWS Lambda、Docker 等。
詳見 [Nuxt 部署文檔](https://nuxt.com/docs/getting-started/deployment)。

> 注意：目前的資料庫連線走 Neon 的 HTTP driver。若要部署到**非** Neon 的 PostgreSQL，
> 需要改寫 [`server/utils/db.ts`](server/utils/db.ts) 換成 `pg` 或 `postgres.js` driver。

## 🔐 安全性

已經做到的：

- ✅ 所有 API 金鑰只存在伺服器端
- ✅ 密碼以 bcrypt 雜湊（cost 10）
- ✅ Session 由 Auth.js 以 JWT 管理，`userId` 一律取自伺服器端 session，不信任請求 body
- ✅ SQL injection 防護：Drizzle 產生參數化查詢
- ✅ XSS 防護：Vue 預設轉義
- ✅ 使用者資料隔離：每支查詢都帶 `user_id`；修改/刪除前先驗證擁有權
- ✅ 除錯用的 SSE 端點在 `NODE_ENV=production` 時直接回 404
- ✅ 對話歷史在進入 AI 前經過型別與長度檢查（單則上限 4000 字）

尚未做到的（誠實列出）：

- ⚠️ 註冊流程的邀請碼檢查與標記不是原子操作，理論上存在競態條件（[設計文件 §7.1](docs/database-design.md#71-註冊流程沒有交易保護--最嚴重的一條)）
- ⚠️ 沒有 Row-Level Security，資料隔離全靠應用層
- ⚠️ 沒有 rate limiting，AI API 成本沒有硬性上限（只有事後統計）

## 🎯 AI 功能說明

### Function Calling

Gemini 透過 Function Calling 把自然語言轉成結構化操作，`chat.post.ts` 在一個迴圈裡處理多步呼叫：

| Function | 對應資料庫操作 |
|---|---|
| `addTransaction` | `INSERT ... RETURNING` |
| `queryTransactions` | `SELECT`，可依日期範圍／類別／類型篩選，可依 category / date / type 分組聚合 |
| `updateTransaction` | 先驗證擁有權，再 `UPDATE`（欄位經白名單與型別檢查） |
| `deleteTransaction` | 先驗證擁有權，再 `DELETE` |

### 智能特性

- 自動判斷意圖（新增／查詢／修改／刪除）
- 自動解析金額、類別、日期（系統提示詞會注入今天的日期，所以聽得懂「昨天」「這個月」）
- 查詢有分組統計時自動輸出 ` ```chart ` 區塊，前端渲染成圖表
- 每次查詢回傳該使用者的既有類別清單，讓模型做模糊比對，避免同義詞分裂
- 最近 20 則對話的滑動視窗，支援跨輪次的指代

## 📄 授權

本專案目前尚未附上正式的 `LICENSE` 檔案。
在補齊授權文件前，請勿將本專案視為已依 MIT License 或其他開源授權條款發布。
如需使用、散布或修改本專案內容，請先聯繫作者確認授權方式。

## 👨‍💻 作者

zhengjielin2018-web

## 🔗 相關連結

- [Nuxt 4 文檔](https://nuxt.com/)
- [Drizzle ORM 文檔](https://orm.drizzle.team/)
- [Google Gemini API 文檔](https://ai.google.dev/)
- [shadcn-vue 文檔](https://www.shadcn-vue.com/)
- [Neon 文檔](https://neon.tech/docs)
