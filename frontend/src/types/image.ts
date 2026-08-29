export type VisualReferenceSource =
  | 'mock'
  | 'upload'


export type VisualReference = {
  id: string

  title: string

  src: string

  alt: string

  tags: string[]

  width: number

  height: number

  source:
    VisualReferenceSource

  isFavorite:
    boolean

  createdAt:
    string | null

  fileName?:
    string

  fileSize?:
    number
}