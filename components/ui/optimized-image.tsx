"use client";

import React, { useState } from "react";
import Image from "next/image";


interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  onClick?: () => void;
  draggable?: boolean;
  style?: React.CSSProperties;
  sizes?: string;
  // สำหรับ thumbnail
  thumbnail?: boolean;
  thumbnailWidth?: number;
}

/**
 * OptimizedImage - Component สำหรับแสดงภาพที่ optimize แล้ว
 * รองรับ Supabase Storage และ external URLs
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  fill = false,
  priority = false,
  quality = 75,
  onClick,
  draggable = true,
  style,
  sizes,
  thumbnail = false,
  thumbnailWidth = 200,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // ถ้าเป็น thumbnail ใช้ความกว้าง/quality ต่ำกว่า
  const finalQuality = thumbnail ? 60 : quality;
  const finalWidth = thumbnail ? thumbnailWidth : width;

  // Placeholder สำหรับตอนโหลด
  const shimmer = `
    <svg width="${finalWidth || 100}" height="${height || 100}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#333" offset="20%" />
          <stop stop-color="#222" offset="50%" />
          <stop stop-color="#333" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${finalWidth || 100}" height="${height || 100}" fill="#333" />
      <rect id="r" width="${finalWidth || 100}" height="${height || 100}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${finalWidth || 100}" to="${finalWidth || 100}" dur="1s" repeatCount="indefinite"  />
    </svg>`;

  const toBase64 = (str: string) =>
    typeof window === "undefined"
      ? Buffer.from(str).toString("base64")
      : window.btoa(str);

  const blurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer)}`;

  // ตรวจสอบว่าเป็น external URL หรือไม่
  const isExternal = src.startsWith("http://") || src.startsWith("https://");

  // ถ้า URL ว่างหรือ error แสดง placeholder
  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: finalWidth, height, ...style }}
        onClick={onClick}
      >
        <span className="text-muted-foreground text-xs">ไม่พบภาพ</span>
      </div>
    );
  }

  // สำหรับ external images ใช้ Next.js Image
  if (isExternal) {
    return (
      <div className={`relative ${fill ? 'w-full h-full' : ''}`} style={!fill ? { width: finalWidth, height } : undefined}>
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : finalWidth}
          height={fill ? undefined : height}
          fill={fill}
          quality={finalQuality}
          priority={priority}
          className={`${className} ${isLoading ? "blur-sm" : "blur-0"} transition-all duration-300`}
          style={{ objectFit: "contain", ...style }}
          sizes={sizes || (fill ? "100vw" : `${finalWidth}px`)}
          placeholder="blur"
          blurDataURL={blurDataURL}
          draggable={draggable}
          onClick={onClick}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
          unoptimized={false}
        />
      </div>
    );
  }

  // สำหรับ local images ใช้ img tag ปกติ
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={finalWidth}
      height={height}
      className={className}
      style={style}
      draggable={draggable}
      onClick={onClick}
      loading={priority ? "eager" : "lazy"}
      onError={() => setHasError(true)}
    />
  );
}

/**
 * LazyImage - Simple img tag with lazy loading
 * ใช้สำหรับกรณีที่ไม่ต้องการ Next.js Image optimization
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  onClick,
  draggable = true,
  style,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
  style?: React.CSSProperties;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width, height, ...style }}
        onClick={onClick}
      >
        <span className="text-muted-foreground text-xs">ไม่พบภาพ</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        style={style}
        draggable={draggable}
        onClick={onClick}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
