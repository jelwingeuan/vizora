import {
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  apiRequest,
} from './api'

import {
  findSimilarImages,
  semanticSearch,
} from './searchService'


vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}))


const mockedApiRequest = vi.mocked(apiRequest)


beforeEach(() => {
  vi.clearAllMocks()
})


it('sends only the trimmed query for semantic search', async () => {
  mockedApiRequest.mockResolvedValueOnce({ results: [] })

  await semanticSearch('  needle  ')

  const options = mockedApiRequest.mock.calls[0][1]

  expect(JSON.parse(String(options?.body))).toEqual({
    query: 'needle',
  })
})


it('rejects an empty query without calling the API', async () => {
  await expect(
    semanticSearch('   '),
  ).rejects.toThrow('Search query cannot be empty.')

  expect(mockedApiRequest).not.toHaveBeenCalled()
})


it('requests similar images with an abort signal', async () => {
  const controller = new AbortController()

  mockedApiRequest.mockResolvedValueOnce({ results: [] })

  await findSimilarImages('image/1', controller.signal)

  expect(mockedApiRequest).toHaveBeenCalledWith(
    '/api/search/similar/image%2F1',
    {
      method: 'POST',
      signal: controller.signal,
    },
  )
})
