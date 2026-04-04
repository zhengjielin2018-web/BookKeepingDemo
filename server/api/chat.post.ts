// server/api/chat.post.ts
import { getServerSession } from '#auth'
import { eq, and, between, desc, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { users, transactions, chatMessages, assistantProfiles, userMemories } from '../database/schema'
import { chat, type HistoryMessage } from '../utils/gemini'
import { logger } from '../utils/logger'

/** Maximum number of history messages loaded from DB for Gemini context. */
const HISTORY_WINDOW = 20
/** Maximum memories per user. */
const MAX_MEMORIES = 20

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  const userName = (session?.user as { id?: string; name?: string } | undefined)?.name ?? undefined
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }
  const body = await readBody(event)
  const { message } = body

  if (!message || typeof message !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '請輸入訊息' })
  }

  // Load conversation history from DB (server-managed)
  const recentMessages = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(HISTORY_WINDOW)

  const history: HistoryMessage[] = recentMessages
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'model', text: m.content }))

  // Load assistant profile
  const profile = await db.query.assistantProfiles.findFirst({
    where: eq(assistantProfiles.userId, userId),
  })

  // Load user memories
  const memories = await db
    .select({ content: userMemories.content })
    .from(userMemories)
    .where(eq(userMemories.userId, userId))
    .orderBy(desc(userMemories.updatedAt))

  // Load last transaction for context
  const [lastTx] = await db
    .select({ amount: transactions.amount, type: transactions.type, category: transactions.category, date: transactions.date })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(1)

  const lastActivity = lastTx
    ? `上次記帳：${lastTx.date} ${lastTx.type} ${lastTx.category} ${lastTx.amount} 元`
    : undefined

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
          // Validate inputs before touching them
          if (typeof args.transactionId !== 'string' || !args.transactionId) {
            return { error: '無效的交易 ID' }
          }
          if (typeof args.updates !== 'object' || args.updates === null || Array.isArray(args.updates)) {
            return { error: '無效的更新內容' }
          }

          const txId = args.transactionId
          const rawUpdates = args.updates as Record<string, unknown>

          // Sanitize: only allow valid, updatable fields with proper type and domain checks
          const updates: {
            amount?: number
            type?: string
            category?: string
            description?: string | null
            date?: string
          } = {}
          if (typeof rawUpdates.amount === 'number' && Number.isInteger(rawUpdates.amount) && rawUpdates.amount > 0) {
            updates.amount = rawUpdates.amount
          }
          if (rawUpdates.type === '收入' || rawUpdates.type === '支出') {
            updates.type = rawUpdates.type
          }
          if (typeof rawUpdates.category === 'string' && rawUpdates.category.length > 0) {
            updates.category = rawUpdates.category
          }
          if ('description' in rawUpdates && (typeof rawUpdates.description === 'string' || rawUpdates.description === null)) {
            updates.description = rawUpdates.description
          }
          if (typeof rawUpdates.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawUpdates.date)) {
            updates.date = rawUpdates.date
          }

          if (Object.keys(updates).length === 0) return { error: '沒有有效的更新欄位' }

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

        case 'saveMemory': {
          const content = args.content as string
          const category = args.category as string
          if (!content || typeof content !== 'string') {
            return { error: '無效的記憶內容' }
          }

          // Count existing memories
          const existingMemories = await db
            .select({ id: userMemories.id, createdAt: userMemories.createdAt })
            .from(userMemories)
            .where(eq(userMemories.userId, userId))
            .orderBy(userMemories.createdAt)

          // FIFO: remove oldest if at limit
          if (existingMemories.length >= MAX_MEMORIES) {
            const toRemove = existingMemories.slice(0, existingMemories.length - MAX_MEMORIES + 1)
            for (const mem of toRemove) {
              await db.delete(userMemories).where(eq(userMemories.id, mem.id))
            }
          }

          await db.insert(userMemories).values({
            userId,
            content: content.slice(0, 500),
            category: category || 'observation',
          })

          logger.log('DB', 'Memory saved', { content, category })
          return { success: true }
        }

        default:
          return { error: `Unknown function: ${name}` }
      }
    }, userName, history, {
      assistantName: profile?.name || '小帳',
      assistantPersonality: profile?.personalityDesc || profile?.personality || '活潑可愛',
      memories: memories.map(m => m.content),
      lastActivity,
    })

    // Persist messages to chat_messages (non-blocking for response)
    try {
      await db.insert(chatMessages).values([
        { userId, role: 'user', content: message },
        { userId, role: 'model', content: result.reply },
      ])
    } catch (e) {
      logger.log('Error', 'Failed to persist chat messages', e)
    }

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
