// OCR Service - Receipt text extraction using Lovable AI vision
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForOCR } from './ocrPreparation';

export interface ReceiptData {
  merchant: string;
  amount: number;
  date: string;
  items: Array<{ name: string; price: number }>;
  category: string;
  confidence: number;
  rawText?: string;
}

export interface OCRResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
}

/**
 * Extract structured data from receipt image using Lovable AI
 */
export async function extractReceiptData(
  imageBlob: Blob
): Promise<OCRResult> {
  try {
    console.log('[OCRService] Starting receipt extraction...');

    // Step 1: Optimize image for OCR
    const optimized = await prepareImageForOCR(imageBlob);
    console.log('[OCRService] Image optimized:', optimized.metadata);

    // Step 2: Upload image to storage (convert data URL back to blob)
    const fileName = `receipt_${Date.now()}.jpg`;
    const response = await fetch(optimized.dataUrl);
    const blob = await response.blob();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('[OCRService] Upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // Step 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(uploadData.path);

    // Step 4: Call OCR processing edge function
    const { data, error } = await supabase.functions.invoke('ocr-process-receipt', {
      body: {
        imageUrl: urlData.publicUrl,
      },
    });

    if (error) {
      console.error('[OCRService] OCR processing error:', error);
      return {
        success: false,
        error: `OCR failed: ${error.message}`,
      };
    }

    console.log('[OCRService] Receipt extracted successfully');
    return {
      success: true,
      data: data as ReceiptData,
    };
  } catch (error) {
    console.error('[OCRService] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate extracted receipt data
 */
export function validateReceiptData(data: Partial<ReceiptData>): boolean {
  if (!data.merchant || data.merchant.trim().length === 0) {
    return false;
  }

  if (!data.amount || data.amount <= 0) {
    return false;
  }

  if (!data.date) {
    return false;
  }

  return true;
}

/**
 * Format receipt data for transaction creation
 */
export function formatReceiptForTransaction(receipt: ReceiptData) {
  return {
    amount: receipt.amount,
    category: receipt.category,
    description: receipt.items.map(item => item.name).join(', ') || receipt.merchant,
    merchant_name: receipt.merchant,
    timestamp: receipt.date,
    receipt_data: {
      items: receipt.items,
      rawText: receipt.rawText,
      confidence: receipt.confidence,
    },
  };
}
