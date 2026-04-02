import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import * as bcryptModule from 'bcrypt'

const bcrypt = (bcryptModule as any).default ?? bcryptModule

// Handle CJS default export in ESM context
const CredentialsProvider = (Credentials as any).default ?? Credentials
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from '../database/schema'
import type { AuthOptions } from 'next-auth'

export const authOptions: AuthOptions = {
  adapter: DrizzleAdapter(db) as AuthOptions['adapter'],
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
          where: eq(users.email, credentials.email),
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password,
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
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
}
