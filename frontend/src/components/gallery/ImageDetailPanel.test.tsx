import {
  act,
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

import type {
  FindSimilarOptions,
} from '../../types/embedding'


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
              expect.objectContaining({
                signal: expect.any(AbortSignal),
                onProgress: expect.any(Function),
              }),
            )

            expect(
              callbacks.onClose,
            ).toHaveBeenCalled()
          },
        )
      },
    )


    it(
      'shows an embedding failure without closing the detail panel',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        callbacks.onFindSimilar
          .mockRejectedValue(
            new Error(
              'Embedding unavailable',
            ),
          )

        render(
          <ImageDetailPanel
            image={uploadedImage}
            onAnalyze={callbacks.onAnalyze}
            onFindSimilar={callbacks.onFindSimilar}
            onSetFavorite={callbacks.onSetFavorite}
            onClose={callbacks.onClose}
          />,
        )

        await user.click(
          screen.getByRole(
            'button',
            { name: 'Find similar' },
          ),
        )

        expect(
          await screen.findByText(
            'Embedding unavailable',
          ),
        ).toBeInTheDocument()

        expect(callbacks.onClose)
          .not.toHaveBeenCalled()
      },
    )


    it(
      'shows comparison progress and aborts when closed',
      async () => {
        const user = userEvent.setup()
        const callbacks = createCallbacks()
        let finish!: () => void
        let options!: FindSimilarOptions

        callbacks.onFindSimilar.mockImplementation(
          (_image, requestOptions) => {
            options = requestOptions
            return new Promise<void>((resolve) => {
              finish = resolve
            })
          },
        )

        const { unmount } = render(
          <ImageDetailPanel
            image={uploadedImage}
            onAnalyze={callbacks.onAnalyze}
            onFindSimilar={callbacks.onFindSimilar}
            onSetFavorite={callbacks.onSetFavorite}
            onClose={callbacks.onClose}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Find similar' }))

        act(() => {
          options.onProgress?.(2, 5)
        })

        expect(screen.getByRole('button', { name: 'Comparing 2 of 5' }))
          .toBeDisabled()

        await user.click(screen.getByRole('button', {
          name: 'Close image details',
        }))

        expect(options.signal?.aborted).toBe(true)
        expect(callbacks.onClose).toHaveBeenCalledTimes(1)

        await act(async () => {
          finish()
        })

        expect(callbacks.onClose).toHaveBeenCalledTimes(1)
        unmount()
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


    it(
      'keeps Tab inside the dialog and returns focus on close',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        const { rerender } =
          render(
            <div>
              <button type="button">
                Open image
              </button>
            </div>,
          )

        const opener =
          screen.getByRole(
            'button',
            {
              name:
                'Open image',
            },
          )

        opener.focus()

        rerender(
          <div>
            <button type="button">
              Open image
            </button>

            <ImageDetailPanel
              image={uploadedImage}
              onAnalyze={callbacks.onAnalyze}
              onFindSimilar={callbacks.onFindSimilar}
              onSetFavorite={callbacks.onSetFavorite}
              onClose={callbacks.onClose}
            />
          </div>,
        )

        const close =
          screen.getByRole(
            'button',
            {
              name:
                'Close image details',
            },
          )

        expect(close).toHaveFocus()

        await user.keyboard(
          '{Shift>}{Tab}{/Shift}',
        )

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Analyze image',
            },
          ),
        ).toHaveFocus()

        await user.keyboard(
          '{Tab}',
        )

        expect(close).toHaveFocus()

        rerender(
          <div>
            <button type="button">
              Open image
            </button>
          </div>,
        )

        expect(opener).toHaveFocus()
      },
    )
  },
)