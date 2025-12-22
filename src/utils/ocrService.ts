import { createWorker, PSM } from 'tesseract.js';

/**
 * OCR Service for extracting text from images
 *
 * Uses Tesseract.js to perform OCR in the browser.
 * Includes image preprocessing for better accuracy.
 */

interface OCROptions {
  language?: string;
  onProgress?: (progress: number) => void;
}

interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Preprocess image for better OCR accuracy
 * - Resize large images to reduce processing time
 * - Images will be processed as-is since Tesseract handles most preprocessing internally
 */
async function preprocessImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Resize if image is too large (>2000px width)
      const maxWidth = 2000;
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image'));
            return;
          }

          // Create new file from blob
          const processedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now(),
          });

          resolve(processedFile);
        },
        'image/png',
        0.95
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from an image using OCR
 *
 * @param imageFile - The image file to process
 * @param options - OCR options (language, progress callback)
 * @returns Extracted text and confidence score
 */
export async function extractTextFromImage(
  imageFile: File,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { language = 'eng', onProgress } = options;

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(imageFile.type)) {
    throw new Error(
      'Invalid file type. Please upload a PNG, JPG, or WEBP image.'
    );
  }

  // Validate file size (10MB for desktop, 5MB for mobile)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

  if (imageFile.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(
      `Image is too large. Maximum size is ${maxSizeMB}MB for ${isMobile ? 'mobile' : 'desktop'} devices.`
    );
  }

  // Preprocess image
  const processedFile = await preprocessImage(imageFile);

  // Create Tesseract worker
  const worker = await createWorker(language, 1, {
    logger: (m) => {
      // Report progress to caller
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    // Configure for better text extraction
    // PSM 3 = Fully automatic page segmentation (default)
    // PSM 6 = Assume a single uniform block of text
    // We'll use PSM 6 for screenshots which typically have structured text
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    // Perform OCR
    const {
      data: { text, confidence },
    } = await worker.recognize(processedFile);

    return {
      text: text.trim(),
      confidence,
    };
  } finally {
    // Clean up worker
    await worker.terminate();
  }
}

/**
 * Validate if an image file is suitable for OCR
 *
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Invalid file type. Please upload a PNG, JPG, or WEBP image.';
  }

  // Check file size
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  const maxSizeMB = maxSize / (1024 * 1024);

  if (file.size > maxSize) {
    return `Image is too large. Maximum size is ${maxSizeMB}MB for ${isMobile ? 'mobile' : 'desktop'} devices.`;
  }

  if (file.size === 0) {
    return 'Image file is empty.';
  }

  return null;
}
