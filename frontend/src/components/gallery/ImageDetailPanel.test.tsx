import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ImageDetailPanel,
} from './ImageDetailPanel'

import type {
  VisualReference,
} from '../../types/image'


const uploadedImage:
VisualReference = {
  id:
    'detail-image',

  title:
    'Detail Reference',

  src:
    '/detail-image.png',

  alt:
    'Detail reference',

  tags: [
    'uploaded',
    'editorial',
  ],

  width:
    1200,

  height:
    800,

  source:
    'upload',

  isFavorite:
    false,

  createdAt:
    '2026-09-06T10:00:00Z',
}


function createCallbacks() {
  return {
    onAnalyze:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),

    onFindSimilar:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),

    onSetFavorite:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),

    onClose:
      vi.fn(),
  }
}


describe(
  'ImageDetailPanel',
  () => {
    it(
      'adds an uploaded image to favorites',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageDetailPanel
            image={
              uploadedImage
            }

            onAnalyze={
              callbacks.onAnalyze
            }

            onFindSimilar={
              callbacks.onFindSimilar
            }

            onSetFavorite={
              callbacks.onSetFavorite
            }

            onClose={
              callbacks.onClose
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Add to favorites',
            },
          ),
        )

        await waitFor(
          () => {
            expect(
              callbacks.onSetFavorite,
            ).toHaveBeenCalledWith(
              uploadedImage,
              true,
            )
          },
        )
      },
    )


    it(
      'shows an analysis error without closing the panel',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        callbacks.onAnalyze
          .mockRejectedValueOnce(
            new Error(
              'Analysis unavailable',
            ),
          )

        render(
          <ImageDetailPanel
            image={
              uploadedImage
            }

            onAnalyze={
              callbacks.onAnalyze
            }

            onFindSimilar={
              callbacks.onFindSimilar
            }

            onSetFavorite={
              callbacks.onSetFavorite
            }

            onClose={
              callbacks.onClose
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Analyze image',
            },
          ),
        )

        expect(
          await screen.findByText(
            'Analysis unavailable',
          ),
        ).toBeInTheDocument()

        expect(
          callbacks.onClose,
        ).not.toHaveBeenCalled()
      },
    )


    it(
      'finds similar images and closes the detail panel',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageDetailPanel
            image={
              uploadedImage
            }

            onAnalyze={
              callbacks.onAnalyze
            }

            onFindSimilar={
              callbacks.onFindSimilar
            }

            onSetFavorite={
              callbacks.onSetFavorite
            }

            onClose={
              callbacks.onClose
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Find similar',
            },
          ),
        )

        await waitFor(
          () => {
            expect(
              callbacks.onFindSimilar,
            ).toHaveBeenCalledWith(
              uploadedImage,
            )

            expect(
              callbacks.onClose,
            ).toHaveBeenCalled()
          },
        )
      },
    )


    it(
      'closes when Escape is pressed',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageDetailPanel
            image={
              uploadedImage
            }

            onAnalyze={
              callbacks.onAnalyze
            }

            onFindSimilar={
              callbacks.onFindSimilar
            }

            onSetFavorite={
              callbacks.onSetFavorite
            }

            onClose={
              callbacks.onClose
            }
          />,
        )

        await user.keyboard(
          '{Escape}',
        )

        expect(
          callbacks.onClose,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)