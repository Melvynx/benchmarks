"use client"

import { useState, useCallback } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface FileUploadProps {
  title: string
  description: string
  multiple?: boolean
  onFilesChange: (files: File[]) => void
}

export function FileUpload({ 
  title, 
  description, 
  multiple = false,
  onFilesChange 
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setFiles(newFiles)
      onFilesChange(newFiles)
      
      // Create preview URLs
      const urls = newFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(urls)
      
      // Clean up old URLs to prevent memory leaks
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [onFilesChange, previewUrls])

  const handleRemoveFile = useCallback((index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
    onFilesChange(newFiles)
    
    const newUrls = [...previewUrls]
    URL.revokeObjectURL(newUrls[index])
    newUrls.splice(index, 1)
    setPreviewUrls(newUrls)
  }, [files, previewUrls, onFilesChange])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      <div className="flex items-center gap-4">
        <Input 
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileChange}
          className="w-full max-w-xs"
        />
      </div>
      
      {previewUrls.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {previewUrls.map((url, index) => (
            <Card key={index} className="relative w-32 h-32 overflow-hidden">
              <img 
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button 
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 w-6 h-6 p-0"
                onClick={() => handleRemoveFile(index)}
              >
                ×
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}