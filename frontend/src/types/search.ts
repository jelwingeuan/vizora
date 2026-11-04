export type SearchResult = {
  id: string
  score: number
}

export type SearchResponse = {
  results: SearchResult[]
}

export type FindSimilarOptions = {
  signal?: AbortSignal
}
