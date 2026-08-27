import {
  apiRequest,
} from './api'

import type {
  Board,
  CreateBoardInput,
} from '../types/board'


type BoardResponse = {
  id: string

  name: string

  description:
    string | null

  image_ids:
    string[]

  created_at:
    string

  updated_at:
    string
}


export async function getBoards():
Promise<Board[]> {
  const response =
    await apiRequest<
      BoardResponse[]
    >(
      '/api/boards',
    )

  return response.map(
    mapBoardResponse,
  )
}


export async function createBoard(
  input:
    CreateBoardInput,
): Promise<Board> {
  const response =
    await apiRequest<
      BoardResponse
    >(
      '/api/boards',

      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            name:
              input.name,

            description:
              input.description
              || null,
          }),
      },
    )

  return mapBoardResponse(
    response,
  )
}


export async function addImageToBoard(
  boardId: string,

  imageId: string,
): Promise<Board> {
  const response =
    await apiRequest<
      BoardResponse
    >(
      `/api/boards/${
        encodeURIComponent(
          boardId,
        )
      }/images/${
        encodeURIComponent(
          imageId,
        )
      }`,

      {
        method:
          'POST',
      },
    )

  return mapBoardResponse(
    response,
  )
}


export async function removeImageFromBoard(
  boardId: string,

  imageId: string,
): Promise<Board> {
  const response =
    await apiRequest<
      BoardResponse
    >(
      `/api/boards/${
        encodeURIComponent(
          boardId,
        )
      }/images/${
        encodeURIComponent(
          imageId,
        )
      }`,

      {
        method:
          'DELETE',
      },
    )

  return mapBoardResponse(
    response,
  )
}


function mapBoardResponse(
  response:
    BoardResponse,
): Board {
  return {
    id:
      response.id,

    name:
      response.name,

    description:
      response.description,

    imageIds:
      response.image_ids,

    createdAt:
      response.created_at,

    updatedAt:
      response.updated_at,
  }
}