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
