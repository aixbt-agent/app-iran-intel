import type { Express, Request, Response as ExpressResponse } from 'express'

type DataApiQueryValue = string | number | boolean | null | undefined

export type DataApiQuery =
  | string
  | URLSearchParams
  | Record<string, DataApiQueryValue>

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function normalizeBaseUrl(value: string | undefined, protocol: 'http' | 'https'): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `${protocol}://${trimmed}`
  const normalized = withProtocol.replace(/\/+$/, '')
  const host = normalized.replace(/^https?:\/\//i, '').split('/')[0] ?? ''
  return host.includes('*') ? null : normalized
}

function applyQuery(url: URL, query: DataApiQuery | undefined): void {
  if (!query) return
  if (typeof query === 'string') {
    url.search = query.startsWith('?') ? query : `?${query}`
    return
  }
  const params = query instanceof URLSearchParams ? query : new URLSearchParams()
  if (!(query instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null) continue
      params.set(key, String(value))
    }
  }
  url.search = params.toString()
}

function buildHeaders(env: NodeJS.ProcessEnv): Headers {
  const headers = new Headers()
  const token = env.DATA_API_TOKEN?.trim()
  if (token) headers.set('x-data-api-token', token)
  return headers
}

export function getDataApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = normalizeBaseUrl(env.DATA_API, env.NODE_ENV === 'production' ? 'https' : 'http')
  if (!explicit) throw new Error('DATA_API is required')
  return explicit
}

export function buildDataApiUrl(
  namespace: string,
  table: string,
  query?: DataApiQuery,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = new URL(`/data/${namespace}/${table}`, getDataApiBase(env))
  applyQuery(url, query)
  return url.toString()
}

export async function fetchDataApiJson<T = unknown>(
  namespace: string,
  table: string,
  query?: DataApiQuery,
  options: Omit<RequestInit, 'headers'> & {
    env?: NodeJS.ProcessEnv
    headers?: HeadersInit
  } = {},
): Promise<T> {
  const env = options.env ?? process.env
  const headers = buildHeaders(env)
  if (options.headers) {
    const extraHeaders = new Headers(options.headers)
    extraHeaders.forEach((value, key) => headers.set(key, value))
  }
  const response = await fetch(buildDataApiUrl(namespace, table, query, env), {
    ...options,
    headers,
  })
  const body = await readJson(response)
  if (!response.ok) {
    throw new Error(
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : `Data API request failed with status ${response.status}`,
    )
  }
  return body as T
}

export function createDataRouteHandler(namespace: string, env: NodeJS.ProcessEnv = process.env) {
  return async function dataRouteHandler(req: Request, res: ExpressResponse) {
    try {
      const table = Array.isArray(req.params.table) ? req.params.table[0] : req.params.table
      if (!table) {
        res.status(400).json({ error: 'Missing data table name' })
        return
      }
      const query = req.originalUrl.split('?')[1]
      const url = buildDataApiUrl(namespace, table, query, env)
      const response = await fetch(url, { headers: buildHeaders(env) })
      const data = await readJson(response)
      if (!response.ok) {
        res.status(response.status).json(
          data && typeof data === 'object'
            ? data
            : { error: `Data API request failed with status ${response.status}` },
        )
        return
      }
      res.json(data)
    } catch (error) {
      console.error('Data API error:', error)
      res.status(500).json({ error: 'Failed to fetch data' })
    }
  }
}

export function addDataRoute(app: Express, namespace: string, env: NodeJS.ProcessEnv = process.env) {
  app.get('/api/data/:table', createDataRouteHandler(namespace, env))
}
