// OCR Service - Receipt text extraction with HF fallback
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
 * Extract structured data from receipt image with intelligent fallback
 */
export async function extractReceiptData(imageBlob: Blob): Promise<OCRResult> {
  try {
    console.log('[OCRService] Starting receipt extraction...');

    // Step 1: Optimize image for OCR
    const optimized = await prepareImageForOCR(imageBlob);
    console.log('[OCRService] Image optimized:', optimized.metadata);

    // Step 2: Upload image to storage
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

    let ocrResult;
    let primaryError;

    // Step 4: Try Google Vision API as primary
    console.log('[OCRService] Trying Google Vision API...');
    const { data: visionData, error: visionError } = await supabase.functions.invoke(
      'google-vision-ocr',
      { body: { imageUrl: urlData.publicUrl } }
    );

    if (!visionError && visionData?.success) {
      ocrResult = visionData.data;
      console.log('[OCRService] Google Vision succeeded');
    } else {
      primaryError = visionError?.message || visionData?.error;
      console.log('[OCRService] Google Vision failed, trying fallback:', primaryError);
      
      // Step 5: Fallback to Lovable AI
      console.log('[OCRService] Trying Lovable AI OCR...');
      const { data: lovableData, error: lovableError } = await supabase.functions.invoke(
        'ocr-process-receipt',
        { body: { imageUrl: urlData.publicUrl } }
      );

      if (!lovableError && lovableData) {
        ocrResult = lovableData;
        console.log('[OCRService] Lovable AI succeeded');
      } else {
        primaryError = lovableError?.message || lovableData?.error;
        console.log('[OCRService] Lovable AI failed, trying final fallback:', primaryError);
        
        // Step 6: Final fallback to Hugging Face (if enabled)
        const { data: hfFallbackFlag } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('flag_name', 'hf_server_ocr_fallback')
          .single();

        if (hfFallbackFlag?.enabled === true) {
          console.log('[OCRService] Trying HF OCR as final fallback...');
          const { data: hfData, error: hfError } = await supabase.functions.invoke(
            'huggingface-ocr-receipt',
            { body: { imageUrl: urlData.publicUrl } }
          );

          if (!hfError && hfData?.success) {
            ocrResult = hfData.data;
            console.log('[OCRService] HF OCR succeeded');
          } else {
            console.log('[OCRService] HF OCR fallback failed:', hfError?.message || hfData?.error);
          }
        }
      }
    }

    if (!ocrResult) {
      throw new Error(`All OCR providers failed. Last error: ${primaryError}`);
    }

    console.log('[OCRService] Receipt extracted successfully');
    return {
      success: true,
      data: ocrResult as ReceiptData,
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
