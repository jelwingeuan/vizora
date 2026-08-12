export type VisualReference = {
  id: string
  title: string
  src: string
  alt: string
  tags: string[]
  width: number
  height: number

  source?: 'mock' | 'upload'
  fileName?: string
  fileSize?: number
}