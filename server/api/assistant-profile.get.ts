import { getServerSession } from '#auth'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { assistantProfiles } from '../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  let profile = await db.query.assistantProfiles.findFirst({
    where: eq(assistantProfiles.userId, userId),
  })

  // Auto-create default profile if not exists
  if (!profile) {
    const [created] = await db.insert(assistantProfiles).values({
      userId,
    }).returning()
    profile = created
  }

  return {
    name: profile.name,
    avatar: profile.avatar,
    personality: profile.personality,
    personalityDesc: profile.personalityDesc,
  }
})
