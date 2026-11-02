import { apiRequest } from './api'

import type {
  SemanticSearchItem,
  SemanticSearchResponse,
} from '../types/search'

const MAX_SEMANTIC_SEARCH_ITEMS = 500

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

  if (items.length > MAX_SEMANTIC_SEARCH_ITEMS) {
    throw new Error(
      `Semantic search supports up to ${MAX_SEMANTIC_SEARCH_ITEMS} references. This library has ${items.length}.`,
    )
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