"use client"

import { useState, useCallback, useTransition } from 'react'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { generateThumbnails } from './actions'
import { useTheme } from '@/components/theme-provider'

export default function YouTubeThumbnailGenerator() {
  const { theme, setTheme } = useTheme()
  const [faceFiles, setFaceFiles] = useState<File[]>([])
  const [inspirationFile, setInspirationFile] = useState<File[]>([])
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [prompt, setPrompt] = useState('')
  const [generationCount, setGenerationCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = useCallback(async () => {
    setIsLoading(true)
    setGeneratedThumbnails([])
    setError(null)
    
    try {
      // Validate inputs
      if (faceFiles.length === 0 && inspirationFile.length === 0 && extraFiles.length === 0 && !prompt.trim()) {
        setError('Please provide at least one input (face, inspiration, extra images, or prompt)')
        setIsLoading(false)
        return
      }

      // Convert files to base64 on the client side
      const faceImages = await Promise.all(
        faceFiles.map(file => fileToBase64(file))
      )
      
      const inspirationImage = inspirationFile.length > 0 
        ? await fileToBase64(inspirationFile[0])
        : null
        
      const extraImages = await Promise.all(
        extraFiles.map(file => fileToBase64(file))
      )

      // Call the server action to generate thumbnails
      startTransition(async () => {
        try {
          const results = await generateThumbnails({
            faceImages,
            inspirationImage,
            extraImages,
            prompt,
            generationCount
          })
          
          setGeneratedThumbnails(results)
        } catch (error) {
          console.error('Generation failed:', error)
          setError(error instanceof Error ? error.message : 'Failed to generate thumbnails')
        } finally {
          setIsLoading(false)
        }
      })
      
    } catch (error) {
      console.error('Generation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate thumbnails')
      setIsLoading(false)
    }
  }, [faceFiles, inspirationFile, extraFiles, prompt, generationCount])

  // Helper function to convert files to base64 on the client side
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert file to base64'))
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleDownload = useCallback(async (url: string, index: number) => {
    try {
      // If the URL is a data URL (base64), we can download it directly
      if (url.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = url
        link.download = `youtube-thumbnail-${index + 1}.png`
        link.click()
      } else {
        // If it's a regular URL, we need to fetch and download it
        const response = await fetch(url)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `youtube-thumbnail-${index + 1}.png`
        link.click()
        
        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      }
    } catch (error) {
      console.error('Failed to download thumbnail:', error)
      setError('Failed to download thumbnail. Please try again.')
    }
  }, [])

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">YouTube Thumbnail Generator</h1>
          <div className="flex items-center gap-2">
            <Switch 
              id="theme-switch"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <Label htmlFor="theme-switch">Dark Mode</Label>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center p-4 text-red-600 dark:text-red-400">
                <div className="mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-8">
            {/* Face Upload */}
            <FileUpload
              title="Face Upload"
              description="Upload face references (multiple allowed)"
              multiple={true}
              onFilesChange={setFaceFiles}
            />

            {/* Inspiration Upload */}
            <FileUpload
              title="Inspiration"
              description="Reference thumbnail from other YouTubers (single image)"
              multiple={false}
              onFilesChange={setInspirationFile}
            />

            {/* Extra Images */}
            <FileUpload
              title="Extra Images"
              description="Additional context images (multiple allowed)"
              multiple={true}
              onFilesChange={setExtraFiles}
            />

            {/* Text Prompt */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Prompt</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed instructions for the thumbnail
                </p>
              </div>
              <Input
                placeholder="Describe your desired thumbnail..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Generation Settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Generation Settings</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="count-slider">Number of thumbnails: {generationCount}</Label>
                  <Slider
                    id="count-slider"
                    min={1}
                    max={4}
                    step={1}
                    value={[generationCount]}
                    onValueChange={(value) => setGenerationCount(value[0])}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || isPending}
                  className="w-full"
                >
                  {(isLoading || isPending) ? 'Generating...' : 'Generate Thumbnails'}
                </Button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Generated Thumbnails</h2>
            
            {(isLoading || isPending) ? (
              <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Generating your thumbnails...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            ) : generatedThumbnails.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedThumbnails.map((url, index) => (
                  <Card key={index} className="relative overflow-hidden">
                    <img
                      src={url}
                      alt={`Generated thumbnail ${index + 1}`}
                      className="w-full h-auto aspect-video object-cover"
                    />
                    <Button
                      variant="secondary"
                      className="mt-2 w-full"
                      onClick={() => handleDownload(url, index)}
                    >
                      Download
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">
                  No thumbnails generated yet. Configure your settings and click "Generate Thumbnails".
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}