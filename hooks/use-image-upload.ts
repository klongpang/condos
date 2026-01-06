"use client";

import { useState, useCallback } from "react";
import { compressImage, isImageFile, formatFileSize, type CompressOptions, type CompressResult } from "@/lib/image-utils";
import { uploadDocument } from "@/app/actions/document-actions";
import { toast } from "sonner";

interface UseImageUploadOptions extends CompressOptions {
  // อัพโหลดพร้อม compress อัตโนมัติ
  autoCompress?: boolean;
  // แสดง toast แจ้งผลการ compress
  showCompressInfo?: boolean;
}

interface UploadProgress {
  status: "idle" | "compressing" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

interface UseImageUploadReturn {
  // States
  isUploading: boolean;
  uploadProgress: UploadProgress;
  
  // ฟังก์ชัน compress ภาพ
  compressAndUpload: (
    file: File,
    formDataParams: {
      paymentId?: string;
      incomeId?: string;
      expenseId?: string;
      condoId?: string;
      tenantId?: string;
      recordId?: string;
      documentType: string;
    }
  ) => Promise<{ success: boolean; message: string; documentId?: string; fileUrl?: string }>;
  
  // ฟังก์ชัน compress หลายไฟล์พร้อมกัน
  compressAndUploadMultiple: (
    files: File[],
    formDataParams: {
      paymentId?: string;
      incomeId?: string;
      expenseId?: string;
      condoId?: string;
      tenantId?: string;
      recordId?: string;
      documentType: string;
    }
  ) => Promise<{ success: boolean; message: string; uploadedCount: number }>;

  // ฟังก์ชัน compress ไฟล์อย่างเดียว (ไม่ upload)
  compressOnly: (file: File) => Promise<CompressResult>;
  
  // Reset state
  resetProgress: () => void;
}

/**
 * Hook สำหรับ upload ภาพพร้อม compress อัตโนมัติ
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    maxSizeKB = 100,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputType = "image/webp",
    autoCompress = true,
    showCompressInfo = true,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });

  const resetProgress = useCallback(() => {
    setUploadProgress({ status: "idle", progress: 0, message: "" });
  }, []);

  // Compress ไฟล์อย่างเดียว
  const compressOnly = useCallback(
    async (file: File): Promise<CompressResult> => {
      if (!isImageFile(file)) {
        return {
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
          width: 0,
          height: 0,
        };
      }

      const result = await compressImage(file, {
        maxSizeKB,
        maxWidth,
        maxHeight,
        quality,
        outputType,
      });

      if (showCompressInfo && result.compressionRatio > 1) {
        toast.success(
          `บีบอัดภาพสำเร็จ: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (ลด ${Math.round((1 - 1 / result.compressionRatio) * 100)}%)`
        );
      }

      return result;
    },
    [maxSizeKB, maxWidth, maxHeight, quality, outputType, showCompressInfo]
  );

  // Compress และ Upload ไฟล์เดียว
  const compressAndUpload = useCallback(
    async (
      file: File,
      formDataParams: {
        paymentId?: string;
        incomeId?: string;
        expenseId?: string;
        condoId?: string;
        tenantId?: string;
        recordId?: string;
        documentType: string;
      }
    ) => {
      setIsUploading(true);
      
      try {
        let fileToUpload = file;

        // Compress ถ้าเป็นภาพและเปิด autoCompress
        if (autoCompress && isImageFile(file)) {
          setUploadProgress({
            status: "compressing",
            progress: 25,
            message: `กำลังบีบอัดภาพ ${file.name}...`,
          });

          const compressResult = await compressImage(file, {
            maxSizeKB,
            maxWidth,
            maxHeight,
            quality,
            outputType,
          });

          fileToUpload = compressResult.file;

          if (showCompressInfo && compressResult.compressionRatio > 1) {
            console.log(
              `[Image Compress] ${file.name}: ${formatFileSize(compressResult.originalSize)} → ${formatFileSize(compressResult.compressedSize)}`
            );
          }
        }

        setUploadProgress({
          status: "uploading",
          progress: 50,
          message: `กำลังอัปโหลด ${fileToUpload.name}...`,
        });

        // สร้าง FormData และ upload
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("documentType", formDataParams.documentType);
        
        if (formDataParams.paymentId) formData.append("paymentId", formDataParams.paymentId);
        if (formDataParams.incomeId) formData.append("incomeId", formDataParams.incomeId);
        if (formDataParams.expenseId) formData.append("expenseId", formDataParams.expenseId);
        if (formDataParams.condoId) formData.append("condoId", formDataParams.condoId);
        if (formDataParams.tenantId) formData.append("tenantId", formDataParams.tenantId);
        if (formDataParams.recordId) formData.append("recordId", formDataParams.recordId);

        const result = await uploadDocument(formData);

        if (result.success) {
          setUploadProgress({
            status: "success",
            progress: 100,
            message: "อัปโหลดสำเร็จ!",
          });
        } else {
          setUploadProgress({
            status: "error",
            progress: 0,
            message: result.message,
          });
        }

        return result;
      } catch (error: any) {
        const errorMessage = error.message || "เกิดข้อผิดพลาดระหว่างอัปโหลด";
        setUploadProgress({
          status: "error",
          progress: 0,
          message: errorMessage,
        });
        return { success: false, message: errorMessage };
      } finally {
        setIsUploading(false);
      }
    },
    [autoCompress, maxSizeKB, maxWidth, maxHeight, quality, outputType, showCompressInfo]
  );

  // Compress และ Upload หลายไฟล์
  const compressAndUploadMultiple = useCallback(
    async (
      files: File[],
      formDataParams: {
        paymentId?: string;
        incomeId?: string;
        expenseId?: string;
        condoId?: string;
        tenantId?: string;
        recordId?: string;
        documentType: string;
      }
    ) => {
      setIsUploading(true);
      let uploadedCount = 0;
      const totalFiles = files.length;

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const progressPercent = Math.round(((i + 1) / totalFiles) * 100);

          setUploadProgress({
            status: "uploading",
            progress: progressPercent,
            message: `กำลังอัปโหลด ${i + 1}/${totalFiles}: ${file.name}`,
          });

          const result = await compressAndUpload(file, formDataParams);
          if (result.success) {
            uploadedCount++;
          }
        }

        const allSuccess = uploadedCount === totalFiles;
        setUploadProgress({
          status: allSuccess ? "success" : "error",
          progress: 100,
          message: `อัปโหลดสำเร็จ ${uploadedCount}/${totalFiles} ไฟล์`,
        });

        return {
          success: allSuccess,
          message: `อัปโหลดสำเร็จ ${uploadedCount}/${totalFiles} ไฟล์`,
          uploadedCount,
        };
      } catch (error: any) {
        setUploadProgress({
          status: "error",
          progress: 0,
          message: error.message || "เกิดข้อผิดพลาด",
        });
        return {
          success: false,
          message: error.message || "เกิดข้อผิดพลาด",
          uploadedCount,
        };
      } finally {
        setIsUploading(false);
      }
    },
    [compressAndUpload]
  );

  return {
    isUploading,
    uploadProgress,
    compressAndUpload,
    compressAndUploadMultiple,
    compressOnly,
    resetProgress,
  };
}
