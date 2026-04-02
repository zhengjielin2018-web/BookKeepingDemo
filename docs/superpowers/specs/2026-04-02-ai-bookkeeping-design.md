# AI 輔助記帳應用 — 設計規格

## 1. 專案概述

使用 Nuxt 4 建立全端「AI 輔助記帳應用」。使用者透過自然語言對話來記錄花費、查詢歷史帳目、產生視覺化報表。所有操作（CRUD + 查詢 + 圖表）皆透過對話完成，不設獨立的管理頁面。

**部署環境**：Vercel（Nuxt 4 + Vercel Postgres）

## 2. 技術選型

| 層級 | 技術 |
|------|------|
| 框架 | Nuxt 4（Vue 3, Composition API, `<script setup>`） |
| UI / 樣式 | Tailwind CSS + Shadcn-Vue |
| 後端 API | Nuxt Server Routes (`/server/api/...`) |
| 資料庫 | Vercel Postgres |
| ORM | Drizzle ORM（PostgreSQL） |
| 身分驗證 | NuxtAuth（@sidebase/nuxt-auth，Credentials Provider，Drizzle Adapter） |
| AI 引擎 | @google/generative-ai SDK（Gemini 3 Flash） |
| 圖表 | Chart.js + vue-chartjs |

## 3. 資料庫 Schema

### 3.1 Auth 表（NuxtAuth / Drizzle Adapter 管理）

- `users` — id, name, email, emailVerified, image, **passwordHash**, **totalPromptTokens** (integer, default 0), **totalCompletionTokens** (integer, default 0)
- `accounts`, `sessions`, `verificationTokens` — Auth.js 標準表
- `inviteCodes` — 邀請碼表（見 3.3）

### 3.2 Transactions 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | `uuid` DEFAULT gen_random_uuid() | 主鍵 |
| userId | `uuid` NOT NULL | FK → users.id, ON DELETE CASCADE |
| amount | `integer` NOT NULL | 金額（新台幣，正整數） |
| type | `varchar(10)` NOT NULL | `"收入"` 或 `"支出"` |
| category | `varchar(50)` NOT NULL | AI 自由判斷的類別 |
| description | `text` | 備註說明 |
| date | `date` NOT NULL | 交易日期 |
| createdAt | `timestamp` DEFAULT now() | 建立時間 |

**索引**：
- `(userId, date)` — 加速日期範圍查詢
- `(userId, category)` — 加速類別查詢

### 3.3 InviteCodes 表（邀請碼）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | `uuid` DEFAULT gen_random_uuid() | 主鍵 |
| code | `varchar(50)` UNIQUE NOT NULL | 邀請序號 |
| usedBy | `uuid` NULL | FK → users.id，使用後填入 |
| usedAt | `timestamp` NULL | 使用時間 |
| createdAt | `timestamp` DEFAULT now() | 建立時間 |

- 管理員預先在 DB 中插入邀請碼
- 註冊時必須輸入有效且未使用的邀請碼
- 註冊成功後將該碼標記為已使用（寫入 usedBy + usedAt）

### 3.4 Token 使用量追蹤

- `users` 表新增 `totalPromptTokens` 和 `totalCompletionTokens` 欄位（integer, default 0）
- 每次 `/api/chat` 呼叫 Gemini 後，從 response 中取得 `usageMetadata`（promptTokenCount, candidatesTokenCount）
- 累加至該使用者的對應欄位

**設計決策**：
- `amount` 用正整數，收入/支出靠 `type` 欄位區分
- `category` 不做 enum，AI 自由判斷但透過 prompt 引導一致性
- 僅新台幣 (TWD)，不支援多幣別

## 4. 類別一致性策略（雙重保障）

### 4.1 寫入時正規化

System prompt 定義建議類別清單：飲食、交通、娛樂、購物、居住、醫療、教育、收入、其他。指示 AI 盡量歸類到建議類別，遇到不適用的可產生新類別但需用簡短一致的詞彙。

### 4.2 查詢時智慧匹配

查詢前先 `SELECT DISTINCT category FROM transactions WHERE userId = ?`，將使用者所有類別清單提供給 Gemini。Gemini 可判斷哪些類別應合併統計（例如「餐飲」歸入「飲食」）。

## 5. Gemini Function Calling 設計

### 5.1 System Prompt

每次呼叫時動態注入：
- 角色定義：記帳助手，幫使用者記錄收支和查詢帳目
- 當前日期與星期：例如「今天是 2026年4月2日（星期四）」，讓 AI 能正確解析「本週三」、「上週五」等相對日期
- 建議類別清單
- 規則：`date` 未提及時預設今天、`type` 由語意判斷、金額必須為正整數
- 圖表指令：查詢結果需視覺化時附帶 `chart` 物件
- 非記帳閒聊：簡短回覆並引導回記帳功能

### 5.2 Function Declarations

#### `addTransaction`
```json
{
  "amount": 200,
  "type": "支出",
  "category": "飲食",
  "description": "拉麵",
  "date": "2026-04-02"
}
```
Server 收到後 Drizzle insert，回傳成功訊息給 Gemini 生成回覆。

#### `queryTransactions`
```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-30",
  "category": null,
  "groupBy": "category",
  "type": null
}
```
Server 查 DB，回傳資料 + distinct category 清單給 Gemini。Gemini 生成文字摘要，需要圖表時附帶 `chart` 物件。

#### `updateTransaction`
```json
{
  "transactionId": "uuid",
  "updates": {
    "amount": 250,
    "description": "味噌拉麵"
  }
}
```
需先驗證該筆交易屬於該 userId。

**transactionId 解析流程**：使用者不會提供 UUID，而是用自然語言描述（例如「把今天那筆拉麵改成 250 元」）。Gemini 需先呼叫 `queryTransactions` 查出符合條件的交易，從結果中取得 transactionId，再呼叫 `updateTransaction`。這是一次對話中的多步 function calling。

#### `deleteTransaction`
```json
{
  "transactionId": "uuid",
  "confirm": true
}
```
需驗證 userId 所有權。刪除同樣需要先透過 `queryTransactions` 定位交易。若查詢結果有多筆符合，Gemini 應列出讓使用者確認要刪除哪一筆。

## 6. API 端點設計

### 6.1 認證相關
- `POST /api/auth/signup` — 自訂註冊端點（驗證邀請碼 → hash password → insert user → 標記邀請碼已使用）
- `GET/POST /api/auth/[...]` — NuxtAuth 預設路由

### 6.2 核心業務
- `POST /api/chat` — 唯一業務端點

**Request**：
```json
{ "message": "今天午餐拉麵 200 元" }
```

**Response**：
```json
{
  "reply": "已記錄：今天飲食支出 200 元（拉麵）",
  "chart": null
}
```

帶圖表時：
```json
{
  "reply": "您 4 月的各類別支出如下：",
  "chart": {
    "type": "pie",
    "title": "4月各類別支出比例",
    "labels": ["飲食", "交通", "娛樂"],
    "datasets": [{ "data": [3000, 1500, 800] }]
  }
}
```

### 6.3 Debug
- `GET /api/debug/logs` — SSE 端點，推送 server 端即時 log（僅 dev 環境）

### 6.4 `/api/chat` 內部流程
1. `getServerSession()` 驗證登入 → 取得 userId
2. 組裝 system prompt（注入今天日期星期 + 建議類別 + 規則）
3. 呼叫 Gemini API（帶 function declarations + 使用者訊息）
4. 若 Gemini 回傳 function call → 執行 Drizzle 操作 → 結果回傳 Gemini → 生成最終回覆
5. 若 Gemini 直接回覆文字（閒聊）→ 直接回傳
6. Response 回傳 `{ reply, chart }`

## 7. 前端頁面與元件

### 7.1 頁面結構
- **`/`** — Landing Page：產品簡介 + CTA 導向登入
- **`/login`** — 登入/註冊：Tab 切換表單
- **`/chat`** — 對話記帳頁（`middleware: 'auth'`）

### 7.2 Chat 頁面元件
```
ChatPage (/chat)
├── ChatMessageList        — 捲動訊息區域
│   ├── ChatBubble         — 單則訊息（使用者 / AI）
│   └── ChatChart          — 嵌入式圖表（Chart.js）
├── ChatInput              — 底部輸入框 + 送出按鈕
├── UserMenu               — 使用者選單（登出）
└── DebugPanel             — 即時 log 面板（僅 dev）
```

### 7.3 對話氣泡
- 使用者訊息：靠右、深色底
- AI 回覆：靠左、淺色底，支援 Markdown 渲染
- AI 回覆帶 `chart` 物件時，ChatBubble 內嵌 ChatChart
- 載入中顯示打字動畫（三點跳動）

### 7.4 圖表渲染
- 支援類型：`pie`（圓餅圖）、`bar`（長條圖）、`line`（折線圖）
- Chart.js `responsive: true`，小螢幕自動縮放
- Desktop 圖表最大寬度 480px，Mobile 寬度 100%

### 7.5 狀態管理
- 不使用 Pinia，對話訊息用 `ref([])` 在 ChatPage 內管理
- 頁面重新整理清空對話，帳目資料在 DB 中不受影響

### 7.6 響應式設計

**斷點**：Tailwind 預設（Mobile < 768px，Desktop ≥ 768px）

| 頁面 | Mobile | Desktop |
|------|--------|---------|
| Landing Page | 單欄堆疊，CTA 全寬 | 左右分欄（文案 + 示意圖） |
| Login | 表單置中全寬 | 表單置中，max-w 400px |
| Chat | 全螢幕對話，輸入框 fixed 底部 | 置中 max-w 768px |

**Debug Panel**：Desktop 右側滑出，Mobile 底部半屏抽屜。快捷鍵 `Ctrl+D` 或按鈕展開。

**UserMenu**：Desktop 右上角下拉選單，Mobile 漢堡選單或簡化頭像 + 登出。

## 8. Debug Log 機制

### 8.1 Server 端
- `server/utils/logger.ts`：EventEmitter 收集 log
- `server/api/debug/logs.get.ts`：SSE 端點推送即時 log
- Log 類型標籤：`[Gemini]`、`[DB]`、`[Auth]`、`[Error]`
- 僅 `dev` 環境啟用

### 8.2 前端
- `DebugPanel.vue`：可收合面板，EventSource 連接 SSE
- 每筆 log 帶時間戳 + 類型標籤
- Production 環境自動隱藏

## 9. 錯誤處理

### 9.1 Server 端
| 情境 | 處理 |
|------|------|
| Gemini API 失敗 | 回傳 `{ reply: "抱歉，AI 暫時無法回應，請稍後再試" }` HTTP 200 |
| Function call 參數缺失/無法解析 | 回傳 `{ reply: "抱歉，我無法理解您的意思，可以換個方式描述嗎？" }` |
| DB 操作失敗 | log 錯誤，回傳 `{ reply: "記錄失敗，請稍後再試" }` |
| 未登入存取 /api/chat | HTTP 401 |
| update/delete 找不到或非本人交易 | 回傳 `{ reply: "找不到這筆記錄，可能已被刪除或不存在" }` |

### 9.2 前端
- API 非 200：顯示通用錯誤氣泡
- 網路斷線：送出按鈕 disable + 提示
- 送出中：按鈕 loading + AI 打字動畫，防止重複送出

### 9.3 原則
- 對使用者：友善中文訊息呈現在對話氣泡中
- 對開發者：server 端 `console.error` 記錄完整錯誤 + Debug Panel 即時推送

## 10. 專案目錄結構

```
BookKeepingDemo/
├── nuxt.config.ts
├── .env                          # POSTGRES_URL, GEMINI_API_KEY, AUTH_SECRET
├── tailwind.config.ts
├── drizzle.config.ts
├── package.json
├── app/
│   ├── pages/
│   │   ├── index.vue             # Landing Page
│   │   ├── login.vue             # 登入/註冊
│   │   └── chat.vue              # 對話記帳（auth middleware）
│   ├── components/
│   │   ├── ui/                   # Shadcn-Vue 元件
│   │   ├── ChatMessageList.vue
│   │   ├── ChatBubble.vue
│   │   ├── ChatChart.vue
│   │   ├── ChatInput.vue
│   │   ├── UserMenu.vue
│   │   └── DebugPanel.vue
│   ├── middleware/
│   │   └── auth.ts
│   └── layouts/
│       └── default.vue
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...].ts          # NuxtAuth catch-all
│   │   │   └── signup.post.ts    # 自訂註冊（含邀請碼驗證）
│   │   ├── chat.post.ts          # 核心對話端點
│   │   └── debug/
│   │       └── logs.get.ts       # SSE debug 端點
│   ├── utils/
│   │   ├── db.ts                 # Drizzle client
│   │   ├── gemini.ts             # Gemini client + function declarations
│   │   ├── auth.ts               # NuxtAuth config + Drizzle Adapter
│   │   └── logger.ts             # EventEmitter log 收集
│   └── database/
│       ├── schema.ts             # Drizzle schema 定義（users, transactions, inviteCodes）
│       └── migrations/           # Drizzle migration 檔案
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-02-ai-bookkeeping-design.md
```

## 11. 環境變數

```env
POSTGRES_URL=                     # Vercel Postgres 連線字串
GEMINI_API_KEY=                   # Google AI Studio 金鑰
AUTH_SECRET=                      # NuxtAuth session 加密隨機字串
```
