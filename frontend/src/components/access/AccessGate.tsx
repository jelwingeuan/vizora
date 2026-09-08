import {
  useEffect,
  useState,
} from 'react'

import type {
  FormEvent,
  ReactNode,
} from 'react'

import {
  ApiError,
  checkAccess,
  clearAccessToken,
  setAccessToken,
} from '../../services/api'


type AccessGateProps = {
  children:
    ReactNode
}


type AccessState =
  | 'checking'
  | 'locked'
  | 'offline'
  | 'unlocked'


export function AccessGate({
  children,
}: AccessGateProps) {
  const [
    accessState,
    setAccessState,
  ] =
    useState<
      AccessState
    >(
      'checking',
    )

  const [
    token,
    setToken,
  ] =
    useState('')

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false)


  useEffect(() => {
    void verifyCurrentAccess()
  }, [])


  async function verifyCurrentAccess() {
    setAccessState(
      'checking',
    )

    setError(
      null,
    )

    try {
      await checkAccess()

      setAccessState(
        'unlocked',
      )

    } catch (
      caughtError
    ) {
      if (
        caughtError
        instanceof ApiError
        &&
        caughtError.status
        === 401
      ) {
        clearAccessToken()

        setAccessState(
          'locked',
        )

        return
      }

      setAccessState(
        'offline',
      )
    }
  }


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const normalizedToken =
      token.trim()

    if (
      !normalizedToken
    ) {
      setError(
        'Enter your VIZORA access token.',
      )

      return
    }

    setIsSubmitting(
      true,
    )

    setError(
      null,
    )

    setAccessToken(
      normalizedToken,
    )

    try {
      await checkAccess()

      setToken(
        '',
      )

      setAccessState(
        'unlocked',
      )

    } catch (
      caughtError
    ) {
      clearAccessToken()

      if (
        caughtError
        instanceof ApiError
        &&
        caughtError.status
        === 401
      ) {
        setError(
          'That access token is not valid.',
        )

        setAccessState(
          'locked',
        )

      } else {
        setError(
          'Unable to reach the VIZORA backend.',
        )

        setAccessState(
          'offline',
        )
      }

    } finally {
      setIsSubmitting(
        false,
      )
    }
  }


  if (
    accessState ===
    'unlocked'
  ) {
    return (
      <>
        {children}
      </>
    )
  }


  if (
    accessState ===
    'checking'
  ) {
    return (
      <main className="access-gate-shell">
        <section
          className="access-gate-card"
          aria-live="polite"
        >
          <span className="access-gate-mark">
            VIZORA
          </span>

          <h1>
            Opening workspace
          </h1>

          <p>
            Checking secure workspace access...
          </p>

          <div
            className="access-gate-loader"
            aria-hidden="true"
          />
        </section>
      </main>
    )
  }


  if (
    accessState ===
    'offline'
  ) {
    return (
      <main className="access-gate-shell">
        <section className="access-gate-card">
          <span className="access-gate-mark">
            VIZORA
          </span>

          <h1>
            Backend unavailable
          </h1>

          <p>
            VIZORA could not reach its API.
            Check the backend or deployment
            configuration and try again.
          </p>

          {error && (
            <p
              className="access-gate-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="access-gate-primary"
            type="button"
            onClick={() => {
              void verifyCurrentAccess()
            }}
          >
            Retry
          </button>
        </section>
      </main>
    )
  }


  return (
    <main className="access-gate-shell">
      <section className="access-gate-card">
        <span className="access-gate-mark">
          VIZORA
        </span>

        <h1>
          Unlock VIZORA
        </h1>

        <p>
          This workspace is protected.
          Enter the owner access token to continue.
        </p>

        <form
          className="access-gate-form"
          onSubmit={
            handleSubmit
          }
        >
          <label
            htmlFor="vizora-access-token"
          >
            Access token
          </label>

          <input
            id="vizora-access-token"
            type="password"
            value={
              token
            }
            autoComplete="current-password"
            disabled={
              isSubmitting
            }
            autoFocus
            onChange={
              (
                event,
              ) =>
                setToken(
                  event.target.value,
                )
            }
          />

          {error && (
            <p
              className="access-gate-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="access-gate-primary"
            type="submit"
            disabled={
              isSubmitting
            }
          >
            {isSubmitting
              ? 'Unlocking...'
              : 'Unlock workspace'}
          </button>
        </form>

        <small className="access-gate-note">
          The token is kept only for this
          browser session and is not built
          into the VIZORA frontend.
        </small>
      </section>
    </main>
  )
}