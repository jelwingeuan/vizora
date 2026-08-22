import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

import {
  MAX_IMAGE_FILE_SIZE,
  validateImageFile,
} from '../../utils/imageFiles'


type ImageDropzoneProps = {
  onFilesSelected: (
    files: File[],
  ) => Promise<void>
}


export function ImageDropzone({
  onFilesSelected,
}: ImageDropzoneProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const [
    isDragging,
    setIsDragging,
  ] = useState(false)

  const [
    isUploading,
    setIsUploading,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null)


  async function handleFiles(
    files: File[],
  ) {
    if (isUploading) {
      return
    }

    setErrorMessage(null)

    const validFiles:
      File[] = []

    const errors:
      string[] = []

    files.forEach(
      (file) => {
        const error =
          validateImageFile(
            file,
          )

        if (error) {
          errors.push(
            `${file.name}: ${error}`,
          )

          return
        }

        validFiles.push(
          file,
        )
      },
    )

    if (
      errors.length > 0
    ) {
      setErrorMessage(
        errors[0],
      )
    }

    if (
      validFiles.length === 0
    ) {
      return
    }

    setIsUploading(true)

    try {
      await onFilesSelected(
        validFiles,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to upload images.',
      )
    } finally {
      setIsUploading(false)
    }
  }


  function handleDrop(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()

    setIsDragging(false)

    void handleFiles(
      Array.from(
        event.dataTransfer.files,
      ),
    )
  }


  function handleDragOver(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()

    if (!isUploading) {
      setIsDragging(true)
    }
  }


  function handleDragLeave(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    if (
      event.currentTarget.contains(
        event.relatedTarget as Node,
      )
    ) {
      return
    }

    setIsDragging(false)
  }


  function handleInputChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ?? [],
      )

    void handleFiles(
      files,
    )

    event.target.value = ''
  }


  return (
    <section className="upload-section">
      <div
        className={
          `upload-dropzone ${
            isDragging
              ? 'upload-dropzone-active'
              : ''
          }`
        }
        onDrop={
          handleDrop
        }
        onDragOver={
          handleDragOver
        }
        onDragLeave={
          handleDragLeave
        }
      >
        <input
          ref={inputRef}
          className="upload-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          disabled={
            isUploading
          }
          onChange={
            handleInputChange
          }
        />

        <div
          className="upload-dropzone-icon"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 16V4" />
            <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </div>

        <div className="upload-dropzone-copy">
          <strong>
            {isUploading
              ? 'Saving references...'
              : 'Drop your references here'}
          </strong>

          <span>
            JPG, PNG or WebP · up to{' '}

            {Math.round(
              MAX_IMAGE_FILE_SIZE
              / 1024
              / 1024,
            )}{' '}

            MB each
          </span>
        </div>

        <button
          className="upload-browse-button"
          type="button"
          disabled={
            isUploading
          }
          onClick={() =>
            inputRef.current
              ?.click()
          }
        >
          {isUploading
            ? 'Uploading...'
            : 'Choose images'}
        </button>
      </div>

      {errorMessage && (
        <p
          className="upload-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </section>
  )
}