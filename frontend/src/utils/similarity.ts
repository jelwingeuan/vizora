export type SimilarityCandidate = {
  id: string

  embedding:
    number[]
}


export type SimilarityRankingOptions = {
  limit?:
    number

  minimumScore?:
    number

  scoreWindow?:
    number
}


const DEFAULT_SIMILARITY_LIMIT =
  8


const DEFAULT_MINIMUM_SCORE =
  0.5


const DEFAULT_SCORE_WINDOW =
  0.14


export function rankSimilarImages(
  sourceEmbedding:
    number[],

  candidates:
    SimilarityCandidate[],

  options:
    SimilarityRankingOptions = {},
): string[] {
  const limit =
    normalizeLimit(
      options.limit
      ?? DEFAULT_SIMILARITY_LIMIT,
    )

  const minimumScore =
    normalizeScore(
      options.minimumScore
      ?? DEFAULT_MINIMUM_SCORE,
    )

  const scoreWindow =
    Math.max(
      0,

      options.scoreWindow
      ?? DEFAULT_SCORE_WINDOW,
    )


  const scoredCandidates =
    candidates
      .map(
        (
          candidate,
        ) => ({
          id:
            candidate.id,

          score:
            cosineSimilarity(
              sourceEmbedding,

              candidate.embedding,
            ),
        }),
      )
      .filter(
        (
          candidate,
        ) =>
          Number.isFinite(
            candidate.score,
          ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.score
          -
          first.score,
      )


  if (
    scoredCandidates.length ===
    0
  ) {
    return []
  }


  const bestScore =
    scoredCandidates[
      0
    ].score


  if (
    bestScore
    < minimumScore
  ) {
    return []
  }


  const adaptiveThreshold =
    Math.max(
      minimumScore,

      bestScore
      - scoreWindow,
    )


  return scoredCandidates
    .filter(
      (
        candidate,
      ) =>
        candidate.score
        >= adaptiveThreshold,
    )
    .slice(
      0,
      limit,
    )
    .map(
      (
        candidate,
      ) =>
        candidate.id,
    )
}


function cosineSimilarity(
  first:
    number[],

  second:
    number[],
): number {
  if (
    first.length === 0
    || first.length !==
      second.length
  ) {
    return 0
  }


  let dotProduct =
    0

  let firstMagnitude =
    0

  let secondMagnitude =
    0


  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    const firstValue =
      first[
        index
      ]

    const secondValue =
      second[
        index
      ]


    if (
      !Number.isFinite(
        firstValue,
      )
      || !Number.isFinite(
        secondValue,
      )
    ) {
      return 0
    }


    dotProduct +=
      firstValue
      * secondValue

    firstMagnitude +=
      firstValue
      * firstValue

    secondMagnitude +=
      secondValue
      * secondValue
  }


  if (
    firstMagnitude ===
    0
    || secondMagnitude ===
      0
  ) {
    return 0
  }


  const score =
    dotProduct
    /
    (
      Math.sqrt(
        firstMagnitude,
      )
      *
      Math.sqrt(
        secondMagnitude,
      )
    )


  return Math.max(
    -1,

    Math.min(
      1,
      score,
    ),
  )
}


function normalizeLimit(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return (
      DEFAULT_SIMILARITY_LIMIT
    )
  }

  return Math.max(
    1,

    Math.floor(
      value,
    ),
  )
}


function normalizeScore(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return (
      DEFAULT_MINIMUM_SCORE
    )
  }

  return Math.max(
    -1,

    Math.min(
      1,
      value,
    ),
  )
}