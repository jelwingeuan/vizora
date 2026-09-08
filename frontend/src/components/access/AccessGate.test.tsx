import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ApiError,
  checkAccess,
  clearAccessToken,
  setAccessToken,
} from '../../services/api'

import {
  AccessGate,
} from './AccessGate'


vi.mock(
  '../../services/api',

  () => {
    class MockApiError
      extends Error {
      status:
        number

      constructor(
        message:
          string,

        status:
          number,
      ) {
        super(
          message,
        )

        this.name =
          'ApiError'

        this.status =
          status
      }
    }

    return {
      ApiError:
        MockApiError,

      checkAccess:
        vi.fn(),

      clearAccessToken:
        vi.fn(),

      setAccessToken:
        vi.fn(),
    }
  },
)


const mockedCheckAccess =
  vi.mocked(
    checkAccess,
  )


const mockedSetAccessToken =
  vi.mocked(
    setAccessToken,
  )


const mockedClearAccessToken =
  vi.mocked(
    clearAccessToken,
  )


describe(
  'AccessGate',

  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()
      },
    )


    it(
      'opens immediately when access protection is disabled',

      async () => {
        mockedCheckAccess
          .mockResolvedValueOnce(
            {
              status:
                'ok',

              protected:
                false,
            },
          )

        render(
          <AccessGate>
            <div>
              Workspace
            </div>
          </AccessGate>,
        )

        expect(
          await screen.findByText(
            'Workspace',
          ),
        ).toBeInTheDocument()
      },
    )


    it(
      'unlocks using a valid access token',

      async () => {
        const user =
          userEvent.setup()

        mockedCheckAccess
          .mockRejectedValueOnce(
            new ApiError(
              (
                'VIZORA access '
                + 'token required.'
              ),
              401,
            ),
          )
          .mockResolvedValueOnce(
            {
              status:
                'ok',

              protected:
                true,
            },
          )

        render(
          <AccessGate>
            <div>
              Workspace
            </div>
          </AccessGate>,
        )

        const input =
          await screen.findByLabelText(
            'Access token',
          )

        await user.type(
          input,
          'release-token',
        )

        await user.click(
          screen.getByRole(
            'button',

            {
              name:
                'Unlock workspace',
            },
          ),
        )

        await waitFor(
          () => {
            expect(
              mockedSetAccessToken,
            ).toHaveBeenCalledWith(
              'release-token',
            )
          },
        )

        expect(
          await screen.findByText(
            'Workspace',
          ),
        ).toBeInTheDocument()

        expect(
          mockedClearAccessToken,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)