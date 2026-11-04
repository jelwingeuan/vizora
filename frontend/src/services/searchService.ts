import { apiRequest } from './api'

import type {
  SearchResponse,
} from '../types/search'


export async function semanticSearch(
  query: string,
): Promise<SearchResponse> {
  const normalizedQuery =
    query.trim()

  if (!normalizedQuery) {
    throw new Error(
      'Search query cannot be empty.',
    )
  }

  return apiRequest<SearchResponse>(
    '/api/search/semantic',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        query: normalizedQuery,
      }),
    },
  )
}


export async function findSimilarImages(
  imageId: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  return apiRequest<SearchResponse>(
    `/api/search/similar/${
      encodeURIComponent(
        imageId,
      )
    }`,
    {
      method: 'POST',
      signal,
    },
  )
}
