interface Jwt {
  sign(payload: Record<string, unknown>): Promise<string>
  verify(token: string): Promise<Record<string, unknown> | false>
}

export async function verifyAuth(jwt: Jwt, headers: Record<string, string | undefined>) {
  const auth = headers.authorization
  if (!auth || !auth.startsWith("Bearer ")) return null
  const payload = await jwt.verify(auth.slice(7))
  if (!payload) return null
  return {
    id: payload.sub as string,
    username: payload.username as string,
    role: payload.role as string,
  }
}
