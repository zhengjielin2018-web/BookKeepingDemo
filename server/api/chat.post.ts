// server/api/chat.post.ts
import { getServerSession } from '#auth'
import { eq, and, between, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { users, transactions } from '../database/schema'
import { chat, type HistoryMessage } from '../utils/gemini'
import { logger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  const userName = (session?.user as { id?: string; name?: string } | undefined)?.name ?? undefined
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }
  const body = await readBody(event)
  const { message, history } = body

  if (!message || typeof message !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '請輸入訊息' })
  }

  // Validate and sanitize incoming conversation history
  const safeHistory: HistoryMessage[] = Array.isArray(history)
    ? history.filter(
        (h): h is HistoryMessage =>
          (h.role === 'user' || h.role === 'model') && typeof h.text === 'string',
      )
    : []

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
          const rawUpdates = args.updates as Record<string, unknown>

          // Sanitize: only allow valid, updatable fields with proper types
          const updates: {
            amount?: number
            type?: string
            category?: string
            description?: string | null
            date?: string
          } = {}
          if (typeof rawUpdates.amount === 'number') updates.amount = rawUpdates.amount
          if (typeof rawUpdates.type === 'string') updates.type = rawUpdates.type
          if (typeof rawUpdates.category === 'string') updates.category = rawUpdates.category
          if ('description' in rawUpdates && (typeof rawUpdates.description === 'string' || rawUpdates.description === null)) updates.description = rawUpdates.description
          if (typeof rawUpdates.date === 'string') updates.date = rawUpdates.date

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

        default:
          return { error: `Unknown function: ${name}` }
      }
    }, userName, safeHistory)

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
