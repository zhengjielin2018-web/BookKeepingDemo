import { getServerSession } from '#auth'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../utils/db'
import { assistantProfiles, transactions, userMemories } from '../../database/schema'

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '早安'
  if (hour >= 12 && hour < 18) return '午安'
  return '晚安'
}

function daysSince(dateStr: string): number {
  const now = new Date()
  const then = new Date(dateStr)
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDaysAgo(days: number): string {
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days === 2) return '前天'
  return `${days} 天前`
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  const userName = (session?.user as { id?: string; name?: string } | undefined)?.name
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  // Load assistant profile
  const profile = await db.query.assistantProfiles.findFirst({
    where: eq(assistantProfiles.userId, userId),
  })
  const assistantName = profile?.name || '小帳'
  const assistantAvatar = profile?.avatar || '🐹'

  // Load last transaction
  const [lastTx] = await db
    .select({ amount: transactions.amount, category: transactions.category, date: transactions.date })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(1)

  // Load a random memory
  const allMemories = await db
    .select({ content: userMemories.content })
    .from(userMemories)
    .where(eq(userMemories.userId, userId))

  const randomMemory = allMemories.length > 0
    ? allMemories[Math.floor(Math.random() * allMemories.length)].content
    : null

  const timeGreeting = getTimeGreeting()
  const displayName = userName || '你'

  let greeting: string

  if (!lastTx) {
    // First-time user
    greeting = `嗨嗨 ${displayName}！我是${assistantName} ${assistantAvatar} 你的專屬記帳小助理～跟我說今天花了什麼吧！`
  } else {
    const days = daysSince(lastTx.date)
    const daysAgoText = formatDaysAgo(days)
    const lastTxInfo = `${daysAgoText}記了一筆${lastTx.category} ${lastTx.amount} 元`

    greeting = `${timeGreeting} ${displayName}！${assistantAvatar} 上次${lastTxInfo}，今天有什麼要記的嗎？`

    // Occasionally add a memory reference
    if (randomMemory && Math.random() > 0.5) {
      greeting += `\n順帶一提，我記得${randomMemory}～`
    }
  }

  return { greeting }
})
