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

// ===== v1.2 tables =====

export const assistantProfiles = pgTable('assistant_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  name: varchar('name', { length: 50 }).notNull().default('小帳'),
  avatar: varchar('avatar', { length: 10 }).notNull().default('🐹'),
  personality: text('personality').notNull().default('活潑可愛'),
  personalityDesc: text('personality_desc'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 10 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('idx_chat_messages_user_created').on(table.userId, table.createdAt),
])

export const userMemories = pgTable('user_memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => [
  index('idx_user_memories_user').on(table.userId),
])

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  usedBy: uuid('used_by').references(() => users.id),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})
