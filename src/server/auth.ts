import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { eq } from "drizzle-orm"
import { users, invitations } from "@/db/schema"
import type { DB } from "@/db"
import { verifyAuth } from "./guard"

interface AuthContext {
  db: DB
  jwtSecret: string
}

export function createAuthRoutes(context: AuthContext) {
  const { db, jwtSecret } = context

  return new Elysia({ prefix: "/api/auth" })
    .use(jwt({ secret: jwtSecret }))
    .get("/status", async () => {
      const existing = await db.select().from(users).limit(1)
      return { hasUsers: existing.length > 0 }
    })
    .post(
      "/login",
      async ({ body: { username, password }, jwt, status }) => {
        const existing = await db.select().from(users).limit(1)

        if (existing.length === 0) {
          const passwordHash = await Bun.password.hash(password)
          const [user] = await db
            .insert(users)
            .values({ username, passwordHash, role: "admin" })
            .returning()

          if (!user) throw status(500, "Failed to create admin user")

          const token = await jwt.sign({
            sub: user.id,
            username: user.username,
            role: user.role,
          })

          return {
            token,
            user: { id: user.id, username: user.username, role: user.role },
          }
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1)

        if (!user) throw status(401, "Invalid username or password")
        if (!user.isActive) throw status(403, "Account is disabled")

        const valid = await Bun.password.verify(password, user.passwordHash)
        if (!valid) throw status(401, "Invalid username or password")

        const token = await jwt.sign({
          sub: user.id,
          username: user.username,
          role: user.role,
        })

        return {
          token,
          user: { id: user.id, username: user.username, role: user.role },
        }
      },
      {
        body: t.Object({
          username: t.String({ pattern: "^[a-z]([a-z0-9_]*[a-z0-9])?$" }),
          password: t.String(),
        }),
      },
    )
    .get(
      "/register/:code",
      async ({ params: { code }, status }) => {
        const [invite] = await db
          .select()
          .from(invitations)
          .where(eq(invitations.code, code))
          .limit(1)

        if (!invite) throw status(404, "Invalid invite code")
        if (invite.isUsed) throw status(400, "Invite code already used")

        return { valid: true, username: invite.username }
      },
      {
        detail: {
          description:
            "Validate an invite code and return the assigned username",
        },
      },
    )
    .post(
      "/register/:code",
      async ({ params: { code }, body: { password }, jwt, status }) => {
        const [invite] = await db
          .select()
          .from(invitations)
          .where(eq(invitations.code, code))
          .limit(1)

        if (!invite) throw status(404, "Invalid invite code")
        if (invite.isUsed) throw status(400, "Invite code already used")

        const passwordHash = await Bun.password.hash(password)
        const [user] = await db
          .insert(users)
          .values({ username: invite.username, passwordHash, role: "user" })
          .returning()

        if (!user) throw status(500, "Failed to create user")

        await db
          .update(invitations)
          .set({ isUsed: true, usedBy: user.id })
          .where(eq(invitations.id, invite.id))

        const token = await jwt.sign({
          sub: user.id,
          username: user.username,
          role: user.role,
        })

        return {
          token,
          user: { id: user.id, username: user.username, role: user.role },
        }
      },
      {
        body: t.Object({
          password: t.String({ minLength: 6 }),
        }),
        detail: {
          description:
            "Register with an invite code (username is pre-assigned)",
        },
      },
    )
    .get("/me", async ({ jwt, headers, status }) => {
      const user = await verifyAuth(jwt, headers)
      if (!user) throw status(401, "Authentication required")

      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!dbUser) throw new Error("User not found")

      return {
        user: { id: dbUser.id, username: dbUser.username, role: dbUser.role },
      }
    })
}
