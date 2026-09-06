import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ImageCard,
} from './ImageCard'

import type {
  VisualReference,
} from '../../types/image'


const uploadedImage:
VisualReference = {
  id:
    'image-123',

  title:
    'Test Reference',

  src:
    '/test-image.png',

  alt:
    'Test image',

  tags: [
    'uploaded',
    'png',
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

  fileName:
    'test-image.png',

  fileSize:
    12345,
}


function createCallbacks() {
  return {
    onSelect:
      vi.fn(),

    onRename:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),

    onDelete:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),
  }
}


describe(
  'ImageCard',
  () => {
    it(
      'selects an image when the preview is clicked',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageCard
            image={
              uploadedImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Open Test Reference',
            },
          ),
        )

        expect(
          callbacks.onSelect,
        ).toHaveBeenCalledWith(
          uploadedImage,
        )
      },
    )


    it(
      'renames an uploaded image',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageCard
            image={
              uploadedImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Manage Test Reference',
            },
          ),
        )

        await user.click(
          screen.getByRole(
            'menuitem',

            {
              name:
                'Rename',
            },
          ),
        )

        const input =
          screen.getByRole(
            'textbox',
          )

        await user.clear(
          input,
        )

        await user.type(
          input,
          '  Renamed Reference  ',
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Save',
            },
          ),
        )

        await waitFor(
          () => {
            expect(
              callbacks.onRename,
            ).toHaveBeenCalledWith(
              uploadedImage,
              'Renamed Reference',
            )
          },
        )

        expect(
          screen.queryByRole(
            'textbox',
          ),
        ).not.toBeInTheDocument()
      },
    )


    it(
      'shows an inline error for an empty rename',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageCard
            image={
              uploadedImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Manage Test Reference',
            },
          ),
        )

        await user.click(
          screen.getByRole(
            'menuitem',

            {
              name:
                'Rename',
            },
          ),
        )

        await user.clear(
          screen.getByRole(
            'textbox',
          ),
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Save',
            },
          ),
        )

        expect(
          screen.getByRole(
            'alert',
          ),
        ).toHaveTextContent(
          'Enter a name for this reference.',
        )

        expect(
          callbacks.onRename,
        ).not.toHaveBeenCalled()
      },
    )


    it(
      'deletes an uploaded image after confirmation',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageCard
            image={
              uploadedImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Manage Test Reference',
            },
          ),
        )

        await user.click(
          screen.getByRole(
            'menuitem',

            {
              name:
                'Delete',
            },
          ),
        )

        const dialog =
          screen.getByRole(
            'dialog',

            {
              name:
                'Delete Test Reference',
            },
          )

        await user.click(
          within(
            dialog,
          ).getByRole(
            'button',

            {
              name:
                'Delete',
            },
          ),
        )

        await waitFor(
          () => {
            expect(
              callbacks.onDelete,
            ).toHaveBeenCalledWith(
              uploadedImage,
            )
          },
        )
      },
    )


    it(
      'closes the management menu with Escape',
      async () => {
        const user =
          userEvent.setup()

        const callbacks =
          createCallbacks()

        render(
          <ImageCard
            image={
              uploadedImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Manage Test Reference',
            },
          ),
        )

        expect(
          screen.getByRole(
            'menu',
          ),
        ).toBeInTheDocument()

        await user.keyboard(
          '{Escape}',
        )

        expect(
          screen.queryByRole(
            'menu',
          ),
        ).not.toBeInTheDocument()
      },
    )


    it(
      'does not show management controls for mock references',
      () => {
        const callbacks =
          createCallbacks()

        const mockImage:
        VisualReference = {
          ...uploadedImage,

          id:
            'mock-image',

          source:
            'mock',

          createdAt:
            null,
        }

        render(
          <ImageCard
            image={
              mockImage
            }

            isSelected={
              false
            }

            onSelect={
              callbacks.onSelect
            }

            onRename={
              callbacks.onRename
            }

            onDelete={
              callbacks.onDelete
            }
          />,
        )

        expect(
          screen.queryByRole(
            'button',

            {
              name:
                'Manage Test Reference',
            },
          ),
        ).not.toBeInTheDocument()
      },
    )
  },
)