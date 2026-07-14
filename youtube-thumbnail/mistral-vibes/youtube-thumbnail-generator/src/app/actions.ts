"use server"

import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { streamText } from "ai"

interface GenerateThumbnailParams {
  faceImages: string[]
  inspirationImage: string | null
  extraImages: string[]
  prompt: string
  generationCount: number
}

export async function generateThumbnails({
  faceImages,
  inspirationImage,
  extraImages,
  prompt,
  generationCount
}: GenerateThumbnailParams): Promise<string[]> {
  try {
    // Images are already in base64 format from the client
    const preparedFaceImages = prepareImagesForGemini(faceImages)
    const preparedInspirationImage = inspirationImage ? prepareImagesForGemini([inspirationImage])[0] : null
    const preparedExtraImages = prepareImagesForGemini(extraImages)
    
    // Build the comprehensive prompt
    const generatedPrompt = buildThumbnailPrompt({
      faceImages: preparedFaceImages,
      inspirationImage: preparedInspirationImage,
      extraImages: preparedExtraImages,
      userPrompt: prompt
    })
    
    console.log('Generated prompt:', generatedPrompt)
    
    // Generate thumbnails using Gemini API
    // Using gemini-2.5-flash-image-preview for faster image generation
    const result = await generateText({
      model: google("gemini-2.5-flash-image-preview"),
      prompt: generatedPrompt,
      temperature: 0.7,
    })
    
    console.log('AI Response:', result)
    
    // Extract image URLs from the response
    // Using the correct mediaType property as shown in the example
    const imageUrls: string[] = []
    
    if (result.files && Array.isArray(result.files)) {
      for (const file of result.files) {
        if (file && typeof file === 'object' && file.mediaType?.startsWith('image/')) {
          if (file.url && typeof file.url === 'string') {
            imageUrls.push(file.url)
          }
        }
      }
    }
    
    // If we need multiple generations but got fewer images, we can try to regenerate
    if (imageUrls.length < generationCount) {
      // Try to generate more images to reach the desired count
      const additionalImages = await generateAdditionalImages(
        generatedPrompt,
        generationCount - imageUrls.length
      )
      imageUrls.push(...additionalImages)
    }
    
    return imageUrls.slice(0, generationCount)
    
  } catch (error) {
    console.error('Error generating thumbnails:', error)
    throw new Error('Failed to generate thumbnails. Please try again.')
  }
}

async function generateAdditionalImages(prompt: string, count: number): Promise<string[]> {
  const results: string[] = []
  
  for (let i = 0; i < count; i++) {
    try {
      const result = await generateText({
        model: google("gemini-3-pro-image-preview"),
        prompt: `${prompt} (Generate variation ${i + 1})`,
      })
      
      let imageUrl = ''
      if (result.files && result.files.length > 0) {
        const file = result.files[0]
        if (file && file.mediaType?.startsWith('image/') && file.url) {
          imageUrl = file.url
        }
      }
      if (imageUrl) {
        results.push(imageUrl)
      }
    } catch (error) {
      console.error(`Failed to generate additional image ${i + 1}:`, error)
    }
  }
  
  return results
}

function buildThumbnailPrompt({
  faceImages,
  inspirationImage,
  extraImages,
  userPrompt
}: {
  faceImages: string[]
  inspirationImage: string | null
  extraImages: string[]
  userPrompt: string
}): string {
  const promptParts = []
  
  // Always include the 16:9 ratio requirement
  promptParts.push("Create a professional YouTube thumbnail in 16:9 ratio (1280x720 pixels)")
  
  // Add face references with more specific instructions
  if (faceImages.length > 0) {
    promptParts.push(
      `Face references: Include ${faceImages.length} face(s) from the provided images. ` +
      "Ensure faces are clearly visible, well-lit, and positioned prominently in the thumbnail. " +
      "Maintain natural facial expressions and avoid excessive distortion."
    )
  }
  
  // Add inspiration reference with style details
  if (inspirationImage) {
    promptParts.push(
      "Style reference: Follow the visual style, color palette, and composition of the inspiration thumbnail. " +
      "Analyze and replicate the lighting, shadows, text placement, and overall aesthetic while maintaining originality."
    )
  }
  
  // Add extra context with specific guidance
  if (extraImages.length > 0) {
    promptParts.push(
      `Context images: Incorporate relevant elements from ${extraImages.length} additional images. ` +
      "Use these to enhance the theme, add appropriate background elements, or include relevant objects. " +
      "Ensure all elements blend naturally and maintain visual coherence."
    )
  }
  
  // Add user's specific instructions with priority
  if (userPrompt.trim()) {
    promptParts.push(`User requirements: ${userPrompt}`)
  }
  
  // Add professional thumbnail best practices
  promptParts.push(
    "Best practices: Use high contrast for readability, include minimal but impactful text if needed, " +
    "ensure the main subject stands out, and create a design that works well at small sizes. " +
    "Avoid clutter and maintain a clean, professional look suitable for YouTube."
  )
  
  // Combine all parts into a comprehensive prompt
  return promptParts.join('\n\n')
}



// Utility function to prepare images for Gemini API
function prepareImagesForGemini(images: string[]): string[] {
  // The Gemini API expects base64 encoded images with proper mime type
  // Images are already in data URL format from the client-side conversion
  return images.map(img => {
    // Ensure the image data is properly formatted for the API
    if (img.startsWith('data:')) {
      return img
    }
    // If it's just base64 without mime type, we need to add it
    // This is a fallback
    return `data:image/jpeg;base64,${img}`
  })
}

// Helper function to check if a file is an image based on mediaType
function isImageFile(file: any): boolean {
  return file?.mediaType?.startsWith('image/')
}