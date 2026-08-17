export function normalizeImageTag(
  tag: string,
) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function mergeImageTags(
  generatedTags: string[],
  existingTags: string[],
) {
  const mergedTags: string[] = []
  const seen = new Set<string>()

  for (
    const tag of [
      ...generatedTags,
      ...existingTags,
    ]
  ) {
    const normalizedTag =
      normalizeImageTag(tag)

    if (!normalizedTag) {
      continue
    }

    if (seen.has(normalizedTag)) {
      continue
    }

    seen.add(normalizedTag)

    mergedTags.push(normalizedTag)
  }

  return mergedTags
}