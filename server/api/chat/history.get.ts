import { getServerSession } from '#auth'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../utils/db'
import { chatMessages } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  // Fetch most recent 30 messages, ordered oldest first for display
  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30)

  // Reverse to oldest-first for display
  return { messages: messages.reverse() }
})
