import { getBaseUrl } from "./testServer"

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(`${getBaseUrl()}${path}`, options)
  let data: T
  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    data = await response.json()
  } else {
    data = (await response.text()) as T
  }
  return { data, response }
}

export function createClient(baseUrl: () => string) {
  return {
    get: <T>(path: string) =>
      fetch(`${baseUrl()}${path}`).then(async (r) => ({
        response: r,
        data: r.headers.get("content-type")?.includes("json")
          ? await r.json()
          : await r.text(),
      })) as Promise<{ response: Response; data: T }>,
    post: <T>(path: string, body?: object) =>
      fetch(`${baseUrl()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }).then(async (r) => ({
        response: r,
        data: r.headers.get("content-type")?.includes("json")
          ? await r.json()
          : await r.text(),
      })) as Promise<{ response: Response; data: T }>,
  }
}
