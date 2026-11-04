export type ImageEmbedding = {
  embedding: number[]
  dimensions: number
  model: string
}


export type CachedEmbeddingsResponse = {
  embeddings: Record<string, ImageEmbedding>
}


export type FindSimilarOptions = {
  signal?: AbortSignal
  onProgress?: (completed: number, total: number) => void
}