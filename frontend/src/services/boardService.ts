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

    createdAt:
      response.created_at,

    updatedAt:
      response.updated_at,
  }
}