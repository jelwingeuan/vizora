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


function resolveOrigin(
  url:
    string,
): string | null {
  try {
    return new URL(
      url,
      window.location.origin,
    ).origin

  } catch {
    return null
  }
}


// Only first-party origins may receive the
// access token. Image URLs come from API
// responses, so never trust them blindly.
function canReceiveAccessToken(
  url:
    string,
): boolean {
  if (
    typeof window ===
      'undefined'
  ) {
    return false
  }

  const targetOrigin =
    resolveOrigin(
      url,
    )

  if (!targetOrigin) {
    return false
  }

  const trustedOrigins = [
    window.location.origin,
    resolveOrigin(
      API_BASE_URL
      || window.location.origin,
    ),
  ]

  return trustedOrigins.includes(
    targetOrigin,
  )
}


export async function fetchWithAccess(
  url:
    string,

  options:
    RequestInit = {},
): Promise<Response> {
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
    && canReceiveAccessToken(
      url,
    )
  ) {
    headers.set(
      ACCESS_HEADER_NAME,
      accessToken,
    )
  }


  return fetch(
    url,

    {
      ...options,
      headers,
    },
  )
}


export async function apiRequest<T>(
  path:
    string,

  options:
    RequestInit = {},
): Promise<T> {
  const response =
    await fetchWithAccess(
      `${API_BASE_URL}${path}`,
      options,
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