export type SemanticSearchItem = {
  id: string
  title: string
  text: string
}

export type SemanticSearchResult = {
  id: string
  score: number
}

export type SemanticSearchResponse = {
  results: SemanticSearchResult[]
}