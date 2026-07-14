"use client"

import { ImagePlusIcon, Trash2Icon } from "lucide-react"
import Image from "next/image"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"

import { cn } from "@/lib/utils"

export type UploadImage = {
  id: string
  name: string
  dataUrl: string
}

type UploadZoneProps = {
  title: string
  description: string
  files: UploadImage[]
  onFilesAdded: (files: File[]) => void
  onRemove: (id: string) => void
  multiple?: boolean
  maxFiles?: number
}

export function UploadZone({
  title,
  description,
  files,
  onFilesAdded,
  onRemove,
  multiple = false,
  maxFiles = 1,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return
      }

      onFilesAdded(acceptedFiles)
    },
    [onFilesAdded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple,
    maxFiles,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-100 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {files.length}/{maxFiles}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>

      <div
        {...getRootProps({
          className: cn(
            "group cursor-pointer rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
            isDragActive &&
              "border-zinc-500 bg-zinc-200/80 dark:border-zinc-500 dark:bg-zinc-800"
          ),
        })}
      >
        <input {...getInputProps()} />
        <ImagePlusIcon className="mx-auto mb-3 size-5 text-zinc-500 dark:text-zinc-300" />
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          Drag and drop or click to upload
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative h-24 w-full">
                <Image
                  src={file.dataUrl}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 160px"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(file.id)
                }}
                className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove ${file.name}`}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
