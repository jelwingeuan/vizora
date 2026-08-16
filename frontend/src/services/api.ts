import type { HealthResponse } from '../types/api'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (!headers.has('Accept')) {
    headers.set(
      'Accept',
      'application/json',
    )
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  )

  if (!response.ok) {
    let message =
      `API request failed with status ${response.status}`

    try {
      const data = await response.json() as {
        detail?: string
      }

      if (data.detail) {
        message = data.detail
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>(
    '/api/health',
  )
}