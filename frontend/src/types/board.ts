export type Board = {
  id: string

  name: string

  description:
    string | null

  imageIds:
    string[]

  createdAt: string

  updatedAt: string
}


export type CreateBoardInput = {
  name: string

  description?:
    string
}