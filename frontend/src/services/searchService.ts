import { apiRequest } from './api'

import type {
  SemanticSearchItem,
  SemanticSearchResponse,
} from '../types/search'

export async function semanticSearch(
  query: string,
  items: SemanticSearchItem[],
): Promise<SemanticSearchResponse> {
  const normalizedQuery =
    query.trim()

  if (!normalizedQuery) {
    throw new Error(
      'Search query cannot be empty.',
    )
  }

  if (items.length === 0) {
    return {
      results: [],
    }
  }

  return apiRequest<SemanticSearchResponse>(
    '/api/search/semantic',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        query: normalizedQuery,
        items,
      }),
    },
  )
}