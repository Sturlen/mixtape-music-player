import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { eq, desc } from "drizzle-orm"
import { users, invitations } from "@/db/schema"
import type { DB } from "@/db"
import { verifyAuth } from "./guard"

interface AdminContext {
  db: DB
  jwtSecret: string
}

export function createAdminRoutes(context: AdminContext) {
  const { db, jwtSecret } = context

  return new Elysia({ prefix: "/api/admin" })
    .use(jwt({ secret: jwtSecret }))
    .get("/users", async ({ jwt, headers, status }) => {
      const user = await verifyAuth(jwt, headers)
      if (!user) throw status(401, "Authentication required")
      if (user.role !== "admin") throw status(403, "Admin access required")

      const rows = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))

      return { users: rows }
    })
    .delete(
      "/users/:id",
      async ({ params: { id }, jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        if (user.role !== "admin") throw status(403, "Admin access required")

        const [target] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1)

        if (!target) throw status(404, "User not found")
        if (target.role === "admin") throw status(403, "Cannot deactivate admin users")

        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, id))

        return { success: true }
      },
      {
        detail: { description: "Deactivate a user account" },
      },
    )
    .post(
      "/invitations",
      async ({ body: { username }, jwt, headers, status }) => {
        const user = await verifyAuth(jwt, headers)
        if (!user) throw status(401, "Authentication required")
        if (user.role !== "admin") throw status(403, "Admin access required")

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1)
        if (existing.length > 0) throw status(409, "Username already taken")

        const code = crypto.randomUUID()
        const [invite] = await db
          .insert(invitations)
          .values({ code, username, createdBy: user.id })
          .returning()

        if (!invite) throw status(500, "Failed to create invite")

        return {
          invitation: {
            id: invite.id,
            code: invite.code,
            username: invite.username,
            link: `/register?code=${invite.code}`,
            isUsed: false,
            createdAt: invite.createdAt,
          },
        }
      },
      {
        body: t.Object({
          username: t.String({ minLength: 2, maxLength: 32, pattern: "^[a-z]([a-z0-9_]*[a-z0-9])?$" }),
        }),
        detail: { description: "Create an invitation with a pre-selected username" },
      },
    )
    .get("/invitations", async ({ jwt, headers, status }) => {
      const user = await verifyAuth(jwt, headers)
      if (!user) throw status(401, "Authentication required")
      if (user.role !== "admin") throw status(403, "Admin access required")

      const rows = await db
        .select({
          id: invitations.id,
          code: invitations.code,
          username: invitations.username,
          isUsed: invitations.isUsed,
          createdAt: invitations.createdAt,
          createdBy: invitations.createdBy,
          usedBy: invitations.usedBy,
        })
        .from(invitations)
        .orderBy(desc(invitations.createdAt))

      return { invitations: rows }
    })
}
