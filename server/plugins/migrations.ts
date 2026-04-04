import { neon } from '@neondatabase/serverless'

/**
 * Nuxt server plugin that runs idempotent DDL for v1.2 tables on every cold start.
 * Uses IF NOT EXISTS so it is safe to run repeatedly.
 */
export default defineNitroPlugin(async () => {
  if (!process.env.POSTGRES_URL) return

  try {
    const sql = neon(process.env.POSTGRES_URL)

    await sql`
      CREATE TABLE IF NOT EXISTS "assistant_profiles" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id"          uuid NOT NULL UNIQUE
                             REFERENCES "users"("id") ON DELETE CASCADE,
        "name"             varchar(50)  NOT NULL DEFAULT '小帳',
        "avatar"           varchar(10)  NOT NULL DEFAULT '🐹',
        "personality"      text         NOT NULL DEFAULT '活潑可愛',
        "personality_desc" text,
        "created_at"       timestamp DEFAULT now(),
        "updated_at"       timestamp DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id"    uuid NOT NULL
                       REFERENCES "users"("id") ON DELETE CASCADE,
        "role"       varchar(10) NOT NULL,
        "content"    text        NOT NULL,
        "created_at" timestamp   NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_user_created"
        ON "chat_messages" ("user_id", "created_at")
    `

    await sql`
      CREATE TABLE IF NOT EXISTS "user_memories" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id"    uuid NOT NULL
                       REFERENCES "users"("id") ON DELETE CASCADE,
        "content"    text        NOT NULL,
        "category"   varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS "idx_user_memories_user"
        ON "user_memories" ("user_id")
    `

    console.log('[DB] Schema check complete')
  }
  catch (e) {
    console.error('[DB] Schema init failed:', e)
  }
})
