import { getServerSession } from '#auth'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { assistantProfiles } from '../database/schema'

const PERSONALITY_PRESETS: Record<string, string> = {
  '活潑可愛': '語氣溫暖俏皮，喜歡用「～」「喔」「呢」等語助詞，適度使用 emoji，像一個開朗的小動物夥伴',
  '溫柔體貼': '語氣溫柔細膩，像一位貼心的好朋友，會關心使用者的心情和感受',
  '專業幹練': '語氣簡潔有條理，像一位可靠的財務秘書，重點清晰、數據精準',
  '搞笑幽默': '語氣風趣搞笑，喜歡用諧音梗和雙關語，讓記帳變得開心',
}

const ALLOWED_AVATARS = ['🐹', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦉', '🐧', '🐝', '🤖']

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const body = await readBody(event)
  const { name, avatar, personality, personalityDesc } = body

  // Validate
  const trimmedName = typeof name === 'string' ? name.trim() : undefined
  if (name !== undefined && (typeof name !== 'string' || !trimmedName || trimmedName.length < 1 || trimmedName.length > 20)) {
    throw createError({ statusCode: 400, statusMessage: '名字長度需在 1-20 字之間' })
  }
  if (avatar !== undefined && !ALLOWED_AVATARS.includes(avatar)) {
    throw createError({ statusCode: 400, statusMessage: '無效的頭像選項' })
  }
  if (personalityDesc !== undefined) {
    if (typeof personalityDesc !== 'string') {
      throw createError({ statusCode: 400, statusMessage: '無效的個性描述格式' })
    }
    if (personalityDesc.length > 200) {
      throw createError({ statusCode: 400, statusMessage: '自訂個性描述上限 200 字' })
    }
  }

  // Build update object
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (trimmedName !== undefined) updates.name = trimmedName
  if (avatar !== undefined) updates.avatar = avatar
  if (personality !== undefined) {
    updates.personality = personality
    // Auto-fill personalityDesc for presets
    if (PERSONALITY_PRESETS[personality]) {
      updates.personalityDesc = PERSONALITY_PRESETS[personality]
    }
  }
  if (personalityDesc !== undefined) updates.personalityDesc = personalityDesc

  // Upsert: update if exists, create if not
  const existing = await db.query.assistantProfiles.findFirst({
    where: eq(assistantProfiles.userId, userId),
  })

  if (existing) {
    await db.update(assistantProfiles)
      .set(updates)
      .where(eq(assistantProfiles.userId, userId))
  } else {
    const newPersonality = (personality as string) || '活潑可愛'
    const newPersonalityDesc =
      (personalityDesc as string) ||
      PERSONALITY_PRESETS[newPersonality] ||
      PERSONALITY_PRESETS['活潑可愛']

    await db.insert(assistantProfiles).values({
      userId,
      name: (name as string) || '小帳',
      avatar: (avatar as string) || '🐹',
      personality: newPersonality,
      personalityDesc: newPersonalityDesc,
    })
  }

  return { success: true }
})
