export type SimilarityCandidate = {
  id: string
  embedding: number[]
}

export function rankSimilarImages(
  sourceEmbedding: number[],
  candidates: SimilarityCandidate[],
  limit = 8,
): string[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,

      score: cosineSimilarity(
        sourceEmbedding,
        candidate.embedding,
      ),
    }))
    .sort(
      (first, second) =>
        second.score - first.score,
    )
    .slice(0, limit)
    .map(
      (result) => result.id,
    )
}


function cosineSimilarity(
  first: number[],
  second: number[],
): number {
  if (
    first.length === 0 ||
    first.length !== second.length
  ) {
    return 0
  }

  let dotProduct = 0
  let firstMagnitude = 0
  let secondMagnitude = 0

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    const firstValue =
      first[index]

    const secondValue =
      second[index]

    dotProduct +=
      firstValue * secondValue

    firstMagnitude +=
      firstValue * firstValue

    secondMagnitude +=
      secondValue * secondValue
  }

  if (
    firstMagnitude === 0 ||
    secondMagnitude === 0
  ) {
    return 0
  }

  return (
    dotProduct /
    (
      Math.sqrt(firstMagnitude) *
      Math.sqrt(secondMagnitude)
    )
  )
}