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
  semanticSearch,
} from './searchService'


vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}))


const mockedApiRequest = vi.mocked(apiRequest)


function createItems(count: number) {
  return Array.from(
    { length: count },
    (_, index) => ({
      id: `image-${index}`,
      title: `Reference ${index}`,
      text: 'Visual metadata',
    }),
  )
}


beforeEach(() => {
  vi.clearAllMocks()
})


it('submits every reference in a 500-item library', async () => {
  mockedApiRequest.mockResolvedValueOnce({ results: [] })

  await semanticSearch('needle', createItems(500))

  const options = mockedApiRequest.mock.calls[0][1]
  const body = JSON.parse(String(options?.body))

  expect(body.items).toHaveLength(500)
  expect(body.items[499].id).toBe('image-499')
})


it('reports the supported limit without submitting a larger library', async () => {
  await expect(
    semanticSearch('needle', createItems(501)),
  ).rejects.toThrow(
    'Semantic search supports up to 500 references. This library has 501.',
  )

  expect(mockedApiRequest).not.toHaveBeenCalled()
})
