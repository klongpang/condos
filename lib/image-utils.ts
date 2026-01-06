/**
 * Image Utilities - บีบอัดภาพก่อน upload ให้ไม่เกิน 100KB
 */

export interface CompressOptions {
  maxSizeKB?: number;      // ขนาดสูงสุดเป็น KB (default: 100)
  maxWidth?: number;       // ความกว้างสูงสุด (default: 1920)
  maxHeight?: number;      // ความสูงสูงสุด (default: 1080)
  quality?: number;        // คุณภาพเริ่มต้น 0-1 (default: 0.8)
  outputType?: string;     // ประเภทไฟล์ output (default: 'image/webp')
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

/**
 * ตรวจสอบว่าไฟล์เป็นรูปภาพหรือไม่
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * บีบอัดภาพให้มีขนาดไม่เกินที่กำหนด
 * @param file - ไฟล์ภาพที่ต้องการบีบอัด
 * @param options - ตัวเลือกการบีบอัด
 * @returns Promise<CompressResult> - ผลลัพธ์การบีบอัด
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxSizeKB = 100,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputType = 'image/webp',
  } = options;

  const maxSizeBytes = maxSizeKB * 1024;
  const originalSize = file.size;

  // ถ้าไฟล์เล็กกว่า maxSize อยู่แล้ว และไม่ใช่ภาพ ให้คืนค่าเดิม
  if (!isImageFile(file)) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      width: 0,
      height: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('ไม่สามารถสร้าง canvas context ได้'));
      return;
    }

    img.onload = async () => {
      try {
        // คำนวณขนาดใหม่
        let { width, height } = img;

        // ปรับขนาดให้พอดีกับ maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // วาดภาพลง canvas
        ctx.drawImage(img, 0, 0, width, height);

        // บีบอัดภาพด้วย quality ที่ปรับได้
        let currentQuality = quality;
        let blob: Blob | null = null;
        let attempts = 0;
        const maxAttempts = 10;

        // ลดคุณภาพจนกว่าขนาดจะไม่เกิน maxSize
        while (attempts < maxAttempts) {
          blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, outputType, currentQuality);
          });

          if (!blob) {
            reject(new Error('ไม่สามารถบีบอัดภาพได้'));
            return;
          }

          // ถ้าขนาดไม่เกิน maxSize หรือ quality ต่ำมากแล้ว ให้หยุด
          if (blob.size <= maxSizeBytes || currentQuality <= 0.1) {
            break;
          }

          // ลดคุณภาพลง
          currentQuality -= 0.1;
          attempts++;
        }

        // ถ้ายังเกินขนาด ให้ลดขนาดภาพลงอีก
        if (blob && blob.size > maxSizeBytes) {
          const scaleFactor = Math.sqrt(maxSizeBytes / blob.size) * 0.9;
          const newWidth = Math.round(width * scaleFactor);
          const newHeight = Math.round(height * scaleFactor);

          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, outputType, 0.7);
          });

          width = newWidth;
          height = newHeight;
        }

        if (!blob) {
          reject(new Error('ไม่สามารถบีบอัดภาพได้'));
          return;
        }

        // สร้าง File จาก Blob
        const extension = outputType === 'image/webp' ? '.webp' : 
                         outputType === 'image/jpeg' ? '.jpg' : '.png';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const newFileName = `${baseName}${extension}`;

        const compressedFile = new File([blob], newFileName, {
          type: outputType,
          lastModified: Date.now(),
        });

        resolve({
          file: compressedFile,
          originalSize,
          compressedSize: blob.size,
          compressionRatio: originalSize / blob.size,
          width,
          height,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('ไม่สามารถโหลดภาพได้'));
    };

    // โหลดภาพจาก File
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * บีบอัดหลายภาพพร้อมกัน
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<CompressResult[]> {
  const results = await Promise.all(
    files.map((file) => compressImage(file, options))
  );
  return results;
}

/**
 * จัดรูปแบบขนาดไฟล์ให้อ่านง่าย
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * สร้าง thumbnail URL จากภาพ
 */
export function createThumbnailUrl(
  imageUrl: string,
  width: number = 200,
  quality: number = 75
): string {
  // สำหรับ Supabase Storage, ใช้ transform API
  if (imageUrl.includes('supabase.co/storage') || imageUrl.includes('supabase.in/storage')) {
    const url = new URL(imageUrl);
    // เพิ่ม transform parameters
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', quality.toString());
    return url.toString();
  }
  // สำหรับ URL อื่นๆ ส่งคืนเดิม
  return imageUrl;
}
