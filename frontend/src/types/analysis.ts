export type ImageAnalysis = {
  summary: string
  subject: string

  style: string[]
  mood: string[]

  lighting: string
  composition: string

  color_palette: string[]
  tags: string[]

  creative_notes: string
}