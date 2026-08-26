export type Board = {
  id: string

  name: string

  description:
    string | null

  createdAt: string

  updatedAt: string
}


export type CreateBoardInput = {
  name: string

  description?:
    string
}