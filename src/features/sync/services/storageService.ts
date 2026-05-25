// Storage service for file uploads and management - Phase 1
import { supabase } from '@/integrations/supabase/client';

export interface UploadOptions {
  bucket: 'receipts' | 'documents';
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  path: string;
  url: string;
  publicUrl: string;
}

// Upload file to storage
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, onProgress } = options;

  // Compress image if needed
  const processedFile = await compressImage(file);

  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, processedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  // Simulate progress for now (real progress tracking requires custom implementation)
  if (onProgress) {
    onProgress(100);
  }

  return {
    path: data.path,
    url: urlData.publicUrl,
    publicUrl: urlData.publicUrl,
  };
}

// Download file from storage
export async function downloadFile(
  bucket: 'receipts' | 'documents',
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

// Delete file from storage
export async function deleteFile(
  bucket: 'receipts' | 'documents',
  path: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// List files in a directory
export interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

export async function listFiles(
  bucket: 'receipts' | 'documents',
  path: string = ''
): Promise<FileItem[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`List files failed: ${error.message}`);
  }

  return data as FileItem[];
}

// Get signed URL for private file access
export async function getSignedUrl(
  bucket: 'receipts' | 'documents',
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

// Compress image before upload
async function compressImage(file: File): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip if already small
  if (file.size < 500 * 1024) { // 500KB
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(file);
          return;
        }

        // Calculate new dimensions (max 1920x1920)
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Get user-specific path
export function getUserPath(userId: string, filename: string): string {
  return `${userId}/${Date.now()}_${filename}`;
}
