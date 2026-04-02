# AI 輔助記帳應用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack AI bookkeeping app where users manage finances through natural language chat, powered by Nuxt 4 + Gemini 3 Flash + Vercel Postgres.

**Architecture:** Nuxt 4 full-stack app with server routes handling all DB and AI interactions. Gemini Function Calling drives CRUD operations on transactions. Chart.js renders inline charts in chat bubbles. NuxtAuth with Credentials Provider + invite codes for access control.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS, Shadcn-Vue, Drizzle ORM, Vercel Postgres, @google/generative-ai (Gemini 3 Flash), Chart.js + vue-chartjs, @sidebase/nuxt-auth

---

## File Structure

```
BookKeepingDemo/
├── nuxt.config.ts                        # Nuxt config: modules, runtimeConfig
├── tailwind.config.ts                    # Tailwind config
├── drizzle.config.ts                     # Drizzle migration config
├── package.json
├── .env                                  # POSTGRES_URL, GEMINI_API_KEY, AUTH_SECRET
├── app/
│   ├── app.vue                           # Root app component
│   ├── layouts/
│   │   └── default.vue                   # Default layout
│   ├── pages/
│   │   ├── index.vue                     # Landing page
│   │   ├── login.vue                     # Login/register with tabs
│   │   └── chat.vue                      # Chat page (auth protected)
│   ├── components/
│   │   ├── ChatMessageList.vue           # Scrollable message area
│   │   ├── ChatBubble.vue                # Single message bubble
│   │   ├── ChatChart.vue                 # Inline Chart.js chart
│   │   ├── ChatInput.vue                 # Input box + send button
│   │   ├── UserMenu.vue                  # User dropdown / logout
│   │   └── DebugPanel.vue                # Dev-only SSE log panel
│   └── middleware/
│       └── auth.ts                       # Redirect to /login if not authed
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...].ts                  # NuxtAuth catch-all handler
│   │   │   └── signup.post.ts            # Registration with invite code
│   │   ├── chat.post.ts                  # Core chat endpoint
│   │   └── debug/
│   │       └── logs.get.ts               # SSE debug log endpoint
│   ├── utils/
│   │   ├── db.ts                         # Drizzle client instance
│   │   ├── gemini.ts                     # Gemini client + function declarations + handlers
│   │   ├── auth.ts                       # NuxtAuth config + Drizzle adapter
│   │   └── logger.ts                     # EventEmitter-based logger
│   └── database/
│       ├── schema.ts                     # All Drizzle table definitions
│       └── migrations/                   # Generated migration files
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `.env`, `app/app.vue`

- [ ] **Step 1: Initialize Nuxt 4 project**

```bash
cd D:/Jeb/Try/BookKeepingDemo
npx nuxi@latest init . --force
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm @vercel/postgres @google/generative-ai chart.js vue-chartjs @sidebase/nuxt-auth next-auth@4.21.1 @auth/drizzle-adapter bcrypt
npm install -D drizzle-kit @types/bcrypt tailwindcss @nuxtjs/tailwindcss shadcn-nuxt
```

- [ ] **Step 3: Configure nuxt.config.ts**

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },

  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@sidebase/nuxt-auth',
  ],

  auth: {
    baseURL: '/api/auth',
    provider: {
      type: 'authjs',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    authSecret: process.env.AUTH_SECRET,
  },
})
```

- [ ] **Step 4: Configure Tailwind**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,ts}',
  ],
} satisfies Config
```

- [ ] **Step 5: Configure Drizzle**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})
```

- [ ] **Step 6: Create .env file**

```env
POSTGRES_URL=
GEMINI_API_KEY=
AUTH_SECRET=
```

- [ ] **Step 7: Create app.vue**

```vue
<!-- app/app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Nuxt dev server starts without errors at http://localhost:3000

- [ ] **Step 9: Commit**

```bash
git init
echo "node_modules\n.nuxt\n.output\n.env" > .gitignore
git add -A
git commit -m "feat: scaffold Nuxt 4 project with dependencies"
```

---

### Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `server/database/schema.ts`, `server/utils/db.ts`

- [ ] **Step 1: Define all database tables**

```ts
// server/database/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ===== Auth.js tables =====

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash').notNull(),
  totalPromptTokens: integer('total_prompt_tokens').notNull().default(0),
  totalCompletionTokens: integer('total_completion_tokens').notNull().default(0),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 255 }),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// ===== Business tables =====

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  date: date('date', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => [
  index('idx_transactions_user_date').on(table.userId, table.date),
  index('idx_transactions_user_category').on(table.userId, table.category),
])

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  usedBy: uuid('used_by').references(() => users.id),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})
```

- [ ] **Step 2: Create Drizzle client**

```ts
// server/utils/db.ts
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from '../database/schema'

export const db = drizzle(sql, { schema })
```

- [ ] **Step 3: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Tables created in Postgres. Output shows all tables being created.

- [ ] **Step 4: Verify tables exist**

```bash
npx drizzle-kit studio
```

Expected: Drizzle Studio opens showing users, accounts, sessions, verification_tokens, transactions, invite_codes tables.

- [ ] **Step 5: Commit**

```bash
git add server/database/schema.ts server/utils/db.ts server/database/migrations/
git commit -m "feat: add Drizzle schema with auth, transactions, invite_codes tables"
```

---

### Task 3: Authentication — NuxtAuth + Signup

**Files:**
- Create: `server/utils/auth.ts`, `server/api/auth/[...].ts`, `server/api/auth/signup.post.ts`

- [ ] **Step 1: Configure NuxtAuth with Credentials Provider**

```ts
// server/utils/auth.ts
import CredentialsProvider from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from '../database/schema'
import type { NuxtAuthHandler } from '#auth'

export const authOptions: NuxtAuthHandler = {
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
}
```

- [ ] **Step 2: Create NuxtAuth catch-all route**

```ts
// server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'
import { authOptions } from '../../utils/auth'

export default NuxtAuthHandler(authOptions)
```

- [ ] **Step 3: Create signup endpoint with invite code validation**

```ts
// server/api/auth/signup.post.ts
import bcrypt from 'bcrypt'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../../utils/db'
import { users, inviteCodes } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name, inviteCode } = body

  if (!email || !password || !inviteCode) {
    throw createError({ statusCode: 400, statusMessage: '請填寫所有必填欄位' })
  }

  // Validate invite code
  const code = await db.query.inviteCodes.findFirst({
    where: and(
      eq(inviteCodes.code, inviteCode),
      isNull(inviteCodes.usedBy),
    ),
  })
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: '邀請碼無效或已被使用' })
  }

  // Check duplicate email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: '此 Email 已被註冊' })
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 10)
  const [newUser] = await db.insert(users).values({
    email,
    name: name || email.split('@')[0],
    passwordHash,
  }).returning({ id: users.id })

  // Mark invite code as used
  await db.update(inviteCodes)
    .set({ usedBy: newUser.id, usedAt: new Date() })
    .where(eq(inviteCodes.id, code.id))

  return { success: true }
})
```

- [ ] **Step 4: Verify signup + login flow**

Insert a test invite code manually:
```sql
INSERT INTO invite_codes (code) VALUES ('TEST-001');
```

Test signup:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","inviteCode":"TEST-001"}'
```

Expected: `{ "success": true }`

Test login via NuxtAuth:
```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

Expected: Returns session cookie.

- [ ] **Step 5: Commit**

```bash
git add server/utils/auth.ts server/api/auth/
git commit -m "feat: add NuxtAuth credentials provider with invite code signup"
```

---

### Task 4: Debug Logger & SSE Endpoint

**Files:**
- Create: `server/utils/logger.ts`, `server/api/debug/logs.get.ts`

- [ ] **Step 1: Create EventEmitter-based logger**

```ts
// server/utils/logger.ts
import { EventEmitter } from 'events'

interface LogEntry {
  timestamp: string
  type: 'Gemini' | 'DB' | 'Auth' | 'Error'
  message: string
  data?: unknown
}

class AppLogger extends EventEmitter {
  log(type: LogEntry['type'], message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    }
    console.log(`[${entry.type}] ${entry.message}`)
    this.emit('log', entry)
  }
}

export const logger = new AppLogger()
```

- [ ] **Step 2: Create SSE debug endpoint**

```ts
// server/api/debug/logs.get.ts
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404 })
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = new ReadableStream({
    start(controller) {
      const onLog = (entry: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(entry)}\n\n`)
      }
      logger.on('log', onLog)

      event.node.req.on('close', () => {
        logger.off('log', onLog)
        controller.close()
      })
    },
  })

  return sendStream(event, stream)
})
```

- [ ] **Step 3: Verify SSE works**

```bash
npm run dev
# In another terminal:
curl -N http://localhost:3000/api/debug/logs
```

Then trigger a log from the Nuxt server console or by calling an API. Expected: SSE events appear in the curl output.

- [ ] **Step 4: Commit**

```bash
git add server/utils/logger.ts server/api/debug/logs.get.ts
git commit -m "feat: add debug logger with SSE endpoint"
```

---

### Task 5: Gemini Client & Function Calling

**Files:**
- Create: `server/utils/gemini.ts`

- [ ] **Step 1: Create Gemini client with function declarations**

```ts
// server/utils/gemini.ts
import { GoogleGenerativeAI, type FunctionDeclarationsTool } from '@google/generative-ai'
import { logger } from './logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const tools: FunctionDeclarationsTool[] = [
  {
    functionDeclarations: [
      {
        name: 'addTransaction',
        description: '新增一筆收入或支出記錄',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'integer', description: '金額（正整數）' },
            type: { type: 'string', enum: ['收入', '支出'], description: '交易類型' },
            category: { type: 'string', description: '類別（例如：飲食、交通、娛樂）' },
            description: { type: 'string', description: '備註說明' },
            date: { type: 'string', description: '交易日期，格式 YYYY-MM-DD' },
          },
          required: ['amount', 'type', 'category', 'date'],
        },
      },
      {
        name: 'queryTransactions',
        description: '查詢交易記錄，可依日期範圍、類別、類型篩選，可分組統計',
        parameters: {
          type: 'object',
          properties: {
            dateFrom: { type: 'string', description: '起始日期 YYYY-MM-DD' },
            dateTo: { type: 'string', description: '結束日期 YYYY-MM-DD' },
            category: { type: 'string', description: '篩選類別（可不填）', nullable: true },
            type: { type: 'string', enum: ['收入', '支出'], description: '篩選類型（可不填）', nullable: true },
            groupBy: { type: 'string', enum: ['category', 'date', 'type'], description: '分組欄位（可不填）', nullable: true },
          },
          required: ['dateFrom', 'dateTo'],
        },
      },
      {
        name: 'updateTransaction',
        description: '修改一筆交易記錄',
        parameters: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', description: '交易 ID (UUID)' },
            updates: {
              type: 'object',
              properties: {
                amount: { type: 'integer', description: '新金額' },
                type: { type: 'string', enum: ['收入', '支出'] },
                category: { type: 'string' },
                description: { type: 'string' },
                date: { type: 'string', description: 'YYYY-MM-DD' },
              },
            },
          },
          required: ['transactionId', 'updates'],
        },
      },
      {
        name: 'deleteTransaction',
        description: '刪除一筆交易記錄',
        parameters: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', description: '交易 ID (UUID)' },
          },
          required: ['transactionId'],
        },
      },
    ],
  },
]

function buildSystemPrompt(): string {
  const now = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（星期${weekdays[now.getDay()]}）`

  return `你是一個記帳助手，幫使用者記錄收支和查詢帳目。

今天是 ${dateStr}。

## 建議類別
飲食、交通、娛樂、購物、居住、醫療、教育、收入、其他。
請盡量將使用者的花費歸類到上述類別。如果確實不屬於任何一個，可以產生新類別，但用簡短一致的詞彙。

## 規則
- 如果使用者沒有提到日期，預設為今天
- type（收入/支出）由語意判斷
- 金額必須為正整數
- 當使用者要求修改或刪除交易時，先用 queryTransactions 查出符合條件的交易，再用對應的 function
- 如果查詢到多筆符合的交易，列出讓使用者確認要操作哪一筆

## 查詢與圖表
- 查詢結果需要視覺化時，在你的文字回覆之外，額外輸出一個 JSON 區塊，格式如下：
\`\`\`chart
{"type":"pie","title":"標題","labels":["A","B"],"datasets":[{"data":[100,200]}]}
\`\`\`
- 支援的圖表類型：pie（圓餅圖）、bar（長條圖）、line（折線圖）
- 使用者指定圖表形式時照做，未指定時由你判斷最適合的

## 非記帳話題
簡短回覆並引導使用者回到記帳功能。`
}

export interface ChatResult {
  reply: string
  chart: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
  usage: { promptTokens: number; completionTokens: number }
}

export async function chat(
  userMessage: string,
  userId: string,
  executeFn: (name: string, args: Record<string, unknown>) => Promise<unknown>,
): Promise<ChatResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash',
    systemInstruction: buildSystemPrompt(),
    tools,
  })

  const chatSession = model.startChat()

  logger.log('Gemini', 'Sending user message', { userMessage })

  let response = await chatSession.sendMessage(userMessage)
  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  // Loop to handle multi-step function calling
  while (true) {
    const usage = response.response.usageMetadata
    if (usage) {
      totalPromptTokens += usage.promptTokenCount || 0
      totalCompletionTokens += usage.candidatesTokenCount || 0
    }

    const candidate = response.response.candidates?.[0]
    if (!candidate) break

    const functionCalls = candidate.content.parts.filter(p => p.functionCall)
    if (functionCalls.length === 0) break

    // Execute each function call
    const functionResults = []
    for (const part of functionCalls) {
      const { name, args } = part.functionCall!
      logger.log('Gemini', `Function call: ${name}`, args)

      const result = await executeFn(name, args as Record<string, unknown>)
      logger.log('DB', `Function result: ${name}`, result)

      functionResults.push({
        functionResponse: { name, response: { result } },
      })
    }

    // Send function results back to Gemini
    response = await chatSession.sendMessage(functionResults)
  }

  // Extract text reply and chart
  const textParts = response.response.candidates?.[0]?.content.parts
    .filter(p => p.text)
    .map(p => p.text!)
    .join('') || ''

  let chart: ChatResult['chart'] = null
  const chartMatch = textParts.match(/```chart\s*\n?([\s\S]*?)\n?```/)
  if (chartMatch) {
    try {
      chart = JSON.parse(chartMatch[1])
    } catch {
      logger.log('Error', 'Failed to parse chart JSON', chartMatch[1])
    }
  }

  const reply = textParts.replace(/```chart\s*\n?[\s\S]*?\n?```/g, '').trim()

  logger.log('Gemini', 'Final reply', { reply, hasChart: !!chart })

  return {
    reply,
    chart,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/gemini.ts
git commit -m "feat: add Gemini client with function calling and chart parsing"
```

---

### Task 6: Chat API Endpoint

**Files:**
- Create: `server/api/chat.post.ts`

- [ ] **Step 1: Create the chat endpoint with function handlers**

```ts
// server/api/chat.post.ts
import { getServerSession } from '#auth'
import { eq, and, between, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { users, transactions } from '../database/schema'
import { chat } from '../utils/gemini'
import { logger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const userId = session.user.id
  const body = await readBody(event)
  const { message } = body

  if (!message || typeof message !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '請輸入訊息' })
  }

  try {
    const result = await chat(message, userId, async (name, args) => {
      switch (name) {
        case 'addTransaction': {
          const [row] = await db.insert(transactions).values({
            userId,
            amount: args.amount as number,
            type: args.type as string,
            category: args.category as string,
            description: (args.description as string) || null,
            date: args.date as string,
          }).returning()
          logger.log('DB', 'Transaction inserted', row)
          return { success: true, transaction: row }
        }

        case 'queryTransactions': {
          const dateFrom = args.dateFrom as string
          const dateTo = args.dateTo as string
          const category = args.category as string | null
          const type = args.type as string | null
          const groupBy = args.groupBy as string | null

          // Get distinct categories for smart matching
          const allCategories = await db
            .selectDistinct({ category: transactions.category })
            .from(transactions)
            .where(eq(transactions.userId, userId))
          const categoryList = allCategories.map(c => c.category)

          // Build query conditions
          const conditions = [
            eq(transactions.userId, userId),
            between(transactions.date, dateFrom, dateTo),
          ]
          if (category) conditions.push(eq(transactions.category, category))
          if (type) conditions.push(eq(transactions.type, type))

          if (groupBy === 'category') {
            const rows = await db
              .select({
                category: transactions.category,
                total: sql<number>`sum(${transactions.amount})`.as('total'),
                count: sql<number>`count(*)`.as('count'),
              })
              .from(transactions)
              .where(and(...conditions))
              .groupBy(transactions.category)
            return { grouped: rows, allCategories: categoryList }
          }

          if (groupBy === 'date') {
            const rows = await db
              .select({
                date: transactions.date,
                total: sql<number>`sum(${transactions.amount})`.as('total'),
                count: sql<number>`count(*)`.as('count'),
              })
              .from(transactions)
              .where(and(...conditions))
              .groupBy(transactions.date)
              .orderBy(transactions.date)
            return { grouped: rows, allCategories: categoryList }
          }

          if (groupBy === 'type') {
            const rows = await db
              .select({
                type: transactions.type,
                total: sql<number>`sum(${transactions.amount})`.as('total'),
                count: sql<number>`count(*)`.as('count'),
              })
              .from(transactions)
              .where(and(...conditions))
              .groupBy(transactions.type)
            return { grouped: rows, allCategories: categoryList }
          }

          // No groupBy — return raw transactions
          const rows = await db
            .select()
            .from(transactions)
            .where(and(...conditions))
            .orderBy(transactions.date)
          return { transactions: rows, allCategories: categoryList }
        }

        case 'updateTransaction': {
          const txId = args.transactionId as string
          const updates = args.updates as Record<string, unknown>

          // Verify ownership
          const existing = await db.query.transactions.findFirst({
            where: and(eq(transactions.id, txId), eq(transactions.userId, userId)),
          })
          if (!existing) return { error: '找不到這筆記錄' }

          const [updated] = await db.update(transactions)
            .set(updates)
            .where(eq(transactions.id, txId))
            .returning()
          return { success: true, transaction: updated }
        }

        case 'deleteTransaction': {
          const txId = args.transactionId as string

          // Verify ownership
          const existing = await db.query.transactions.findFirst({
            where: and(eq(transactions.id, txId), eq(transactions.userId, userId)),
          })
          if (!existing) return { error: '找不到這筆記錄' }

          await db.delete(transactions).where(eq(transactions.id, txId))
          return { success: true }
        }

        default:
          return { error: `Unknown function: ${name}` }
      }
    })

    // Update user token usage
    await db.update(users)
      .set({
        totalPromptTokens: sql`${users.totalPromptTokens} + ${result.usage.promptTokens}`,
        totalCompletionTokens: sql`${users.totalCompletionTokens} + ${result.usage.completionTokens}`,
      })
      .where(eq(users.id, userId))

    return { reply: result.reply, chart: result.chart }
  } catch (error) {
    logger.log('Error', 'Chat endpoint failed', error)
    return { reply: '抱歉，AI 暫時無法回應，請稍後再試', chart: null }
  }
})
```

- [ ] **Step 2: Verify with curl (requires authenticated session)**

```bash
# After logging in via browser, use the session cookie:
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"message":"今天午餐拉麵 200 元"}'
```

Expected: `{ "reply": "已記錄：...", "chart": null }`

- [ ] **Step 3: Commit**

```bash
git add server/api/chat.post.ts
git commit -m "feat: add chat endpoint with Gemini function calling and token tracking"
```

---

### Task 7: Auth Middleware & Default Layout

**Files:**
- Create: `app/middleware/auth.ts`, `app/layouts/default.vue`

- [ ] **Step 1: Create auth middleware**

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { status } = useAuth()

  if (status.value !== 'authenticated') {
    return navigateTo('/login')
  }
})
```

- [ ] **Step 2: Create default layout**

```vue
<!-- app/layouts/default.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add app/middleware/auth.ts app/layouts/default.vue
git commit -m "feat: add auth middleware and default layout"
```

---

### Task 8: Landing Page

**Files:**
- Create: `app/pages/index.vue`

- [ ] **Step 1: Build landing page**

```vue
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000 — should see landing page with hero text on left and demo conversation on right (stacked on mobile).

- [ ] **Step 3: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat: add responsive landing page"
```

---

### Task 9: Login / Register Page

**Files:**
- Create: `app/pages/login.vue`

- [ ] **Step 1: Build login/register page with tab switching**

```vue
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
```

- [ ] **Step 2: Verify login page renders**

Open http://localhost:3000/login — should see tab-switching form, centered on desktop, full-width on mobile.

- [ ] **Step 3: Commit**

```bash
git add app/pages/login.vue
git commit -m "feat: add login/register page with invite code field"
```

---

### Task 10: Chat Components — ChatInput, ChatBubble, ChatChart

**Files:**
- Create: `app/components/ChatInput.vue`, `app/components/ChatBubble.vue`, `app/components/ChatChart.vue`

- [ ] **Step 1: Create ChatInput**

```vue
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
```

- [ ] **Step 2: Create ChatBubble**

```vue
<!-- app/components/ChatBubble.vue -->
<script setup lang="ts">
defineProps<{
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
  loading?: boolean
}>()
</script>

<template>
  <div :class="['flex mb-3', role === 'user' ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
        role === 'user'
          ? 'bg-black text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md',
      ]"
    >
      <!-- Loading animation -->
      <div v-if="loading" class="flex gap-1 py-1">
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
      </div>

      <!-- Text content -->
      <div v-else>
        <p class="whitespace-pre-wrap">{{ text }}</p>

        <!-- Inline chart -->
        <ChatChart v-if="chart" :chart="chart" class="mt-3" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Create ChatChart**

```vue
<!-- app/components/ChatChart.vue -->
<script setup lang="ts">
import { Pie, Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
)

const props = defineProps<{
  chart: {
    type: string
    title: string
    labels: string[]
    datasets: { data: number[] }[]
  }
}>()

const colors = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]

const chartData = computed(() => ({
  labels: props.chart.labels,
  datasets: props.chart.datasets.map((ds, i) => ({
    ...ds,
    backgroundColor: props.chart.type === 'line'
      ? colors[0]
      : colors.slice(0, props.chart.labels.length),
    borderColor: props.chart.type === 'line' ? colors[0] : undefined,
  })),
}))

const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: props.chart.title,
    },
  },
}))

const chartComponent = computed(() => {
  switch (props.chart.type) {
    case 'bar': return Bar
    case 'line': return Line
    default: return Pie
  }
})
</script>

<template>
  <div class="w-full max-w-[480px]">
    <component
      :is="chartComponent"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add app/components/ChatInput.vue app/components/ChatBubble.vue app/components/ChatChart.vue
git commit -m "feat: add ChatInput, ChatBubble, ChatChart components"
```

---

### Task 11: Chat Components — ChatMessageList, UserMenu, DebugPanel

**Files:**
- Create: `app/components/ChatMessageList.vue`, `app/components/UserMenu.vue`, `app/components/DebugPanel.vue`

- [ ] **Step 1: Create ChatMessageList**

```vue
<!-- app/components/ChatMessageList.vue -->
<script setup lang="ts">
interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
}

defineProps<{
  messages: Message[]
  loading: boolean
}>()

const listRef = ref<HTMLDivElement>()

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto p-4">
    <div v-if="messages.length === 0" class="flex h-full items-center justify-center text-gray-400 text-sm">
      輸入訊息開始記帳，例如「今天午餐 200 元」
    </div>

    <ChatBubble
      v-for="msg in messages"
      :key="msg.id"
      :role="msg.role"
      :text="msg.text"
      :chart="msg.chart"
    />

    <!-- AI loading bubble -->
    <ChatBubble
      v-if="loading"
      role="ai"
      text=""
      :loading="true"
    />
  </div>
</template>
```

- [ ] **Step 2: Create UserMenu**

```vue
<!-- app/components/UserMenu.vue -->
<script setup lang="ts">
const { data: session, signOut } = useAuth()

const open = ref(false)

async function handleLogout() {
  await signOut({ redirect: false })
  navigateTo('/')
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
        @click="handleLogout"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
      >
        登出
      </button>
    </div>

    <!-- Click outside to close -->
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />
  </div>
</template>
```

- [ ] **Step 3: Create DebugPanel**

```vue
<!-- app/components/DebugPanel.vue -->
<script setup lang="ts">
interface LogEntry {
  timestamp: string
  type: string
  message: string
  data?: unknown
}

const visible = ref(false)
const logs = ref<LogEntry[]>([])
const panelRef = ref<HTMLDivElement>()
let eventSource: EventSource | null = null

const isDev = process.dev

function connect() {
  if (!isDev || eventSource) return
  eventSource = new EventSource('/api/debug/logs')
  eventSource.onmessage = (event) => {
    const entry = JSON.parse(event.data) as LogEntry
    logs.value.push(entry)
    // Keep last 200 logs
    if (logs.value.length > 200) logs.value.shift()
    nextTick(() => {
      if (panelRef.value) panelRef.value.scrollTop = panelRef.value.scrollHeight
    })
  }
}

function disconnect() {
  eventSource?.close()
  eventSource = null
}

function toggle() {
  visible.value = !visible.value
  if (visible.value) connect()
  else disconnect()
}

// Ctrl+D shortcut
onMounted(() => {
  if (!isDev) return
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      toggle()
    }
  })
})

onUnmounted(() => disconnect())

const typeColors: Record<string, string> = {
  Gemini: 'text-blue-600',
  DB: 'text-green-600',
  Auth: 'text-purple-600',
  Error: 'text-red-600',
}
</script>

<template>
  <div v-if="isDev">
    <!-- Toggle button -->
    <button
      @click="toggle"
      class="fixed bottom-4 right-4 z-50 rounded-full bg-gray-800 p-2 text-white shadow-lg hover:bg-gray-700 md:bottom-auto md:top-4"
      title="Debug Panel (Ctrl+D)"
    >
      <span class="text-xs font-mono">DBG</span>
    </button>

    <!-- Panel: right slide on desktop, bottom drawer on mobile -->
    <Transition
      enter-active-class="transition-transform duration-200"
      leave-active-class="transition-transform duration-200"
      enter-from-class="translate-x-full md:translate-x-full translate-y-full md:translate-y-0"
      leave-to-class="translate-x-full md:translate-x-full translate-y-full md:translate-y-0"
    >
      <div
        v-if="visible"
        class="fixed z-50 bg-gray-900 text-gray-100 text-xs font-mono
               bottom-0 left-0 right-0 h-1/2
               md:top-0 md:right-0 md:left-auto md:bottom-0 md:h-full md:w-96"
      >
        <div class="flex items-center justify-between border-b border-gray-700 px-3 py-2">
          <span class="font-bold">Debug Logs</span>
          <div class="flex gap-2">
            <button @click="logs = []" class="hover:text-white text-gray-400">Clear</button>
            <button @click="toggle" class="hover:text-white text-gray-400">Close</button>
          </div>
        </div>
        <div ref="panelRef" class="overflow-y-auto h-[calc(100%-2.5rem)] p-2 space-y-1">
          <div v-for="(log, i) in logs" :key="i" class="leading-tight">
            <span class="text-gray-500">{{ log.timestamp.split('T')[1]?.slice(0, 8) }}</span>
            <span :class="typeColors[log.type] || 'text-gray-300'" class="ml-1">[{{ log.type }}]</span>
            <span class="ml-1">{{ log.message }}</span>
            <pre v-if="log.data" class="ml-4 text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add app/components/ChatMessageList.vue app/components/UserMenu.vue app/components/DebugPanel.vue
git commit -m "feat: add ChatMessageList, UserMenu, DebugPanel components"
```

---

### Task 12: Chat Page — Assembling Everything

**Files:**
- Create: `app/pages/chat.vue`

- [ ] **Step 1: Build the chat page**

```vue
<!-- app/pages/chat.vue -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  chart?: { type: string; title: string; labels: string[]; datasets: { data: number[] }[] } | null
}

const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const messageList = ref<InstanceType<typeof ChatMessageList> | null>(null)

async function handleSend(text: string) {
  // Add user message
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    text,
  })
  messageList.value?.scrollToBottom()

  loading.value = true
  try {
    const res = await $fetch('/api/chat', {
      method: 'POST',
      body: { message: text },
    })

    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: res.reply,
      chart: res.chart,
    })
  } catch (e: any) {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: e?.data?.statusMessage === '請先登入'
        ? '您的登入已過期，請重新登入。'
        : '發生錯誤，請稍後再試',
    })
  } finally {
    loading.value = false
    messageList.value?.scrollToBottom()
  }
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between border-b bg-white px-4 py-3">
      <h1 class="text-lg font-bold">AI 記帳助手</h1>
      <UserMenu />
    </header>

    <!-- Messages -->
    <ChatMessageList
      ref="messageList"
      :messages="messages"
      :loading="loading"
      class="flex-1 max-w-3xl w-full mx-auto"
    />

    <!-- Input -->
    <div class="max-w-3xl w-full mx-auto">
      <ChatInput :disabled="loading" @send="handleSend" />
    </div>

    <!-- Debug Panel -->
    <DebugPanel />
  </div>
</template>
```

- [ ] **Step 2: Full integration test in browser**

1. Open http://localhost:3000 — Landing page shows
2. Click「免費開始使用」→ redirects to /login
3. Switch to 註冊 tab, fill in email/password/invite code → register
4. Auto-redirects to /chat
5. Type「今天午餐拉麵 200 元」→ AI responds with confirmation
6. Type「這個月花了多少」→ AI responds with summary
7. Type「用圓餅圖顯示各類別花費」→ AI responds with text + inline pie chart
8. Press Ctrl+D → Debug panel opens showing log entries
9. Click user avatar → dropdown shows → click 登出 → redirects to landing page

- [ ] **Step 3: Commit**

```bash
git add app/pages/chat.vue
git commit -m "feat: add chat page with full AI bookkeeping flow"
```

---

### Task 13: Initialize Shadcn-Vue Components

**Files:**
- Modify: Various Shadcn-Vue component files in `app/components/ui/`

- [ ] **Step 1: Initialize Shadcn-Vue**

```bash
npx shadcn-vue@latest init
```

Follow prompts: select default style, select default base color.

- [ ] **Step 2: Add any needed components**

```bash
npx shadcn-vue@latest add button input tabs card
```

- [ ] **Step 3: Refactor login page to use Shadcn-Vue components (optional enhancement)**

At this point, the base components use plain Tailwind. The Shadcn-Vue components are available in `app/components/ui/` for progressive enhancement if desired.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/
git commit -m "feat: add Shadcn-Vue base components"
```

---

### Task 14: Final Polish & Environment Verification

**Files:**
- Modify: Various files for edge cases

- [ ] **Step 1: Verify .gitignore is complete**

Ensure `.gitignore` contains:
```
node_modules
.nuxt
.output
.env
```

- [ ] **Step 2: Verify all environment variables are documented**

Check `.env` has all three variables:
```env
POSTGRES_URL=
GEMINI_API_KEY=
AUTH_SECRET=
```

- [ ] **Step 3: Run full dev server test**

```bash
npm run dev
```

Walk through the complete flow:
1. Landing page renders responsive on desktop and mobile
2. Register with invite code works
3. Login works
4. Chat: add transaction works
5. Chat: query transactions works
6. Chat: chart rendering works
7. Chat: update/delete via natural language works
8. Debug panel works (Ctrl+D)
9. Logout works

- [ ] **Step 4: Build verification**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final polish and environment verification"
```
