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

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, onProgress } = options;
  const processedFile = await compressImage(file);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, processedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  onProgress?.(100);

  return {
    path: data.path,
    url: urlData.publicUrl,
    publicUrl: urlData.publicUrl,
  };
}

export async function downloadFile(bucket: 'receipts' | 'documents', path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`Download failed: ${error.message}`);
  return data;
}

export async function deleteFile(bucket: 'receipts' | 'documents', path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

export async function listFiles(bucket: 'receipts' | 'documents', path = ''): Promise<FileItem[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) throw new Error(`List files failed: ${error.message}`);
  return data as FileItem[];
}

export async function getSignedUrl(bucket: 'receipts' | 'documents', path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
  return data.signedUrl;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

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
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function getUserPath(userId: string, filename: string): string {
  return `${userId}/${Date.now()}_${filename}`;
}
