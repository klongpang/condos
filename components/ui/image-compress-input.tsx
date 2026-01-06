"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, File, ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { compressImage, isImageFile, formatFileSize, type CompressResult } from "@/lib/image-utils";

interface ImageCompressInputProps {
  /** ไฟล์ที่เลือก (หลัง compress แล้ว) */
  files: File[];
  /** Callback เมื่อไฟล์เปลี่ยน */
  onFilesChange: (files: File[]) => void;
  /** อนุญาตหลายไฟล์ */
  multiple?: boolean;
  /** ประเภทไฟล์ที่ยอมรับ */
  accept?: string;
  /** ขนาดสูงสุดเป็น KB (default: 100) */
  maxSizeKB?: number;
  /** ความกว้างสูงสุด (default: 1920) */
  maxWidth?: number;
  /** ความสูงสูงสุด (default: 1080) */
  maxHeight?: number;
  /** คุณภาพเริ่มต้น 0-1 (default: 0.8) */
  quality?: number;
  /** ประเภทไฟล์ output (default: 'image/webp') */
  outputType?: string;
  /** แสดงข้อมูล compress */
  showCompressInfo?: boolean;
  /** ปิดใช้งาน */
  disabled?: boolean;
  /** กำลังโหลด */
  loading?: boolean;
  /** Label สำหรับ Input */
  label?: string;
  /** ซ่อน label */
  hideLabel?: boolean;
  /** className เพิ่มเติม */
  className?: string;
}

interface CompressedFileInfo {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export function ImageCompressInput({
  files,
  onFilesChange,
  multiple = true,
  accept = "image/*,.pdf,.doc,.docx",
  maxSizeKB = 100,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8,
  outputType = "image/webp",
  showCompressInfo = true,
  disabled = false,
  loading = false,
  label = "แนบไฟล์",
  hideLabel = false,
  className = "",
}: ImageCompressInputProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedFilesInfo, setCompressedFilesInfo] = useState<CompressedFileInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      setIsCompressing(true);
      const newCompressedInfo: CompressedFileInfo[] = [];
      const compressedFiles: File[] = [];

      try {
        for (const file of selectedFiles) {
          if (isImageFile(file)) {
            // Compress ภาพ
            const result = await compressImage(file, {
              maxSizeKB,
              maxWidth,
              maxHeight,
              quality,
              outputType,
            });

            compressedFiles.push(result.file);
            newCompressedInfo.push({
              file: result.file,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              compressionRatio: result.compressionRatio,
            });
          } else {
            // ไม่ใช่ภาพ ใช้ไฟล์เดิม
            compressedFiles.push(file);
            newCompressedInfo.push({
              file,
              originalSize: file.size,
              compressedSize: file.size,
              compressionRatio: 1,
            });
          }
        }

        if (multiple) {
          onFilesChange([...files, ...compressedFiles]);
          setCompressedFilesInfo((prev) => [...prev, ...newCompressedInfo]);
        } else {
          onFilesChange(compressedFiles.slice(0, 1));
          setCompressedFilesInfo(newCompressedInfo.slice(0, 1));
        }
      } catch (error) {
        console.error("Error compressing files:", error);
      } finally {
        setIsCompressing(false);
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [files, multiple, maxSizeKB, maxWidth, maxHeight, quality, outputType, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
      setCompressedFilesInfo((prev) => prev.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const getFileInfo = (file: File, index: number) => {
    const info = compressedFilesInfo[index];
    if (!info) return null;

    if (info.compressionRatio > 1) {
      const savedPercent = Math.round((1 - 1 / info.compressionRatio) * 100);
      return (
        <span className="text-xs text-green-400">
          {formatFileSize(info.originalSize)} → {formatFileSize(info.compressedSize)} (-{savedPercent}%)
        </span>
      );
    }
    return <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>;
  };

  const isDisabled = disabled || loading || isCompressing;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {!hideLabel && (
        <label className="block text-sm font-medium text-gray-300">{label}</label>
      )}

      {/* Upload Button + Files List - Inline Layout */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Upload Button */}
        <label
          className={`inline-flex items-center px-3 py-1.5 border border-gray-600 rounded-lg text-sm transition-colors ${
            isDisabled
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
          }`}
        >
          {isCompressing ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              กำลังบีบอัด...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" />
              เลือกไฟล์
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            disabled={isDisabled}
            onChange={handleFileSelect}
          />
        </label>

        {/* Files as inline chips */}
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-sm"
          >
            {isImageFile(file) ? (
              <ImageIcon className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
            ) : (
              <File className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            )}
            <span className="text-white truncate max-w-[100px]" title={file.name}>
              {file.name}
            </span>
            {showCompressInfo && getFileInfo(file, index)}
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
              title="ลบไฟล์"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        ภาพจะถูกบีบอัดอัตโนมัติให้ไม่เกิน {maxSizeKB} KB
      </p>
    </div>
  );
}
