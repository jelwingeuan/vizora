import type {
  HealthResponse,
} from '../types/api'


const configuredApiBaseUrl =
  (
    import.meta.env
      .VITE_API_BASE_URL
    ?? ''
  ).trim()


const API_BASE_URL = (
  configuredApiBaseUrl
  ||
  (
    import.meta.env.DEV
      ? 'http://127.0.0.1:8000'
      : ''
  )
).replace(
  /\/$/,
  '',
)


const ACCESS_TOKEN_STORAGE_KEY =
  'vizora.accessToken'


const ACCESS_HEADER_NAME =
  'X-Vizora-Token'


export type AccessStatusResponse = {
  status:
    string

  protected:
    boolean
}


export class ApiError
  extends Error {
  status:
    number


  constructor(
    message:
      string,

    status:
      number,
  ) {
    super(
      message,
    )

    this.name =
      'ApiError'

    this.status =
      status
  }
}


export function getAccessToken():
string {
  if (
    typeof window ===
      'undefined'
  ) {
    return ''
  }

  try {
    return (
      window.sessionStorage
        .getItem(
          ACCESS_TOKEN_STORAGE_KEY,
        )
      ?? ''
    )

  } catch {
    return ''
  }
}


export function setAccessToken(
  token:
    string,
) {
  if (
    typeof window ===
      'undefined'
  ) {
    return
  }

  try {
    window.sessionStorage
      .setItem(
        ACCESS_TOKEN_STORAGE_KEY,
        token,
      )

  } catch {
    // Session storage may
    // be unavailable.
  }
}


export function clearAccessToken() {
  if (
    typeof window ===
      'undefined'
  ) {
    return
  }

  try {
    window.sessionStorage
      .removeItem(
        ACCESS_TOKEN_STORAGE_KEY,
      )

  } catch {
    // Session storage may
    // be unavailable.
  }
}


export async function apiRequest<T>(
  path:
    string,

  options:
    RequestInit = {},
): Promise<T> {
  const headers =
    new Headers(
      options.headers,
    )


  if (
    !headers.has(
      'Accept',
    )
  ) {
    headers.set(
      'Accept',
      'application/json',
    )
  }


  const accessToken =
    getAccessToken()


  if (
    accessToken
    && !headers.has(
      ACCESS_HEADER_NAME,
    )
  ) {
    headers.set(
      ACCESS_HEADER_NAME,
      accessToken,
    )
  }


  const response =
    await fetch(
      `${API_BASE_URL}${path}`,

      {
        ...options,
        headers,
      },
    )


  if (!response.ok) {
    let message =
      (
        'API request failed with '
        + `status ${response.status}`
      )


    try {
      const data = (
        await response.json()
      ) as {
        detail?:
          string
      }


      if (
        data.detail
      ) {
        message =
          data.detail
      }

    } catch {
      // Keep default message.
    }


    throw new ApiError(
      message,
      response.status,
    )
  }


  if (
    response.status ===
    204
  ) {
    return (
      undefined as T
    )
  }


  return (
    await response.json()
  ) as T
}


export function getHealth():
Promise<HealthResponse> {
  return apiRequest<
    HealthResponse
  >(
    '/api/health',
  )
}


export function checkAccess():
Promise<AccessStatusResponse> {
  return apiRequest<
    AccessStatusResponse
  >(
    '/api/access',
  )
}