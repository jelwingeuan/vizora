import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ACCESS_REVOKED_EVENT,
  apiRequest,
  fetchWithAccess,
  getAccessToken,
  setAccessToken,
} from './api'


const onRevoked = vi.fn()


function deniedResponse(url = ''): Response {
  return {
    status: 401,
    url,
  } as Response
}


beforeEach(() => {
  window.sessionStorage.clear()
  window.addEventListener(ACCESS_REVOKED_EVENT, onRevoked)
})


afterEach(() => {
  window.removeEventListener(ACCESS_REVOKED_EVENT, onRevoked)
  vi.unstubAllGlobals()
})


it.each([
  '/api/images',
  'http://127.0.0.1:8000/api/images/image-123/file',
])('locks after a current owner token receives 401 from %s', async (url) => {
  setAccessToken('owner-token')
  const fetchMock = vi.fn().mockResolvedValue(
    deniedResponse(new URL(url, window.location.origin).href),
  )
  vi.stubGlobal('fetch', fetchMock)

  await fetchWithAccess(url)

  const options = fetchMock.mock.calls[0][1] as RequestInit
  expect(new Headers(options.headers).get('X-Vizora-Token')).toBe('owner-token')
  expect(getAccessToken()).toBe('')
  expect(onRevoked).toHaveBeenCalledTimes(1)
})


it('ignores a 401 from an untrusted image URL', async () => {
  setAccessToken('owner-token')
  const fetchMock = vi.fn().mockResolvedValue(
    deniedResponse('https://untrusted.example/file'),
  )
  vi.stubGlobal('fetch', fetchMock)

  await fetchWithAccess('https://untrusted.example/file')

  const options = fetchMock.mock.calls[0][1] as RequestInit
  expect(new Headers(options.headers).has('X-Vizora-Token')).toBe(false)
  expect(getAccessToken()).toBe('owner-token')
  expect(onRevoked).not.toHaveBeenCalled()
})


it('ignores a 401 after a trusted request redirects to another origin', async () => {
  setAccessToken('owner-token')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      deniedResponse('https://untrusted.example/file'),
    ),
  )

  await fetchWithAccess('/api/images')

  expect(getAccessToken()).toBe('owner-token')
  expect(onRevoked).not.toHaveBeenCalled()
})


it('ignores a stale 401 after the owner token is replaced', async () => {
  setAccessToken('old-token')
  let resolveResponse!: (response: Response) => void
  const pendingResponse = new Promise<Response>((resolve) => {
    resolveResponse = resolve
  })
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingResponse))

  const request = fetchWithAccess('/api/images')
  setAccessToken('new-token')
  resolveResponse(deniedResponse())
  await request

  expect(getAccessToken()).toBe('new-token')
  expect(onRevoked).not.toHaveBeenCalled()
})


it('keeps Retry-After on API rate-limit errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'Try again shortly.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '2',
          },
        },
      ),
    ),
  )

  await expect(apiRequest('/api/search/similar/test', { method: 'POST' }))
    .rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 2,
    })
})
