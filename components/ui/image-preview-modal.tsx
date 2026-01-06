"use client";

import React, { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Eye, Loader2 } from "lucide-react";
import { Modal } from "./modal";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  documentType?: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  imageName = "รูปภาพ",
  documentType = "เอกสาร",
}: ImagePreviewModalProps) {
  // Zoom and rotation state
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [rotation, setRotation] = useState(0);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Drag state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Reset state on open or URL change
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(0.8); // Default zoom
      setRotation(0);
      setDragOffset({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, imageUrl]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const fitToScreen = useCallback(() => {
    setZoomLevel(0.8);
    setRotation(0);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const resetZoom = fitToScreen;

  // Mouse drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Allow drag at any zoom level for convenience
      setIsDragging(true);
      setDragStart({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
      e.preventDefault();
    },
    [dragOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const newOffset = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        };
        setDragOffset(newOffset);
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
        case "r":
        case "R":
          handleRotate();
          break;
        case "0":
          fitToScreen();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleZoomIn, handleZoomOut, handleRotate, fitToScreen, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      showCloseButton={false}
    >
      <div className="w-full h-screen max-h-[75vh] flex flex-col bg-black">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-white truncate">
              {imageName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{documentType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-white transition-colors"
            title="ปิด (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Display Area */}
        <div
          className="flex-1 overflow-hidden relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                <span className="text-gray-400 text-sm">กำลังโหลดภาพ...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
              <div className="flex flex-col items-center gap-3 text-center">
                <X className="h-10 w-10 text-red-500" />
                <span className="text-gray-400 text-sm">ไม่สามารถโหลดภาพได้</span>
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  ลองใหม่
                </button>
              </div>
            </div>
          )}

          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <div
              className={`relative w-full h-full flex items-center justify-center ${
                isDragging ? "" : "transition-transform duration-200 ease-in-out"
              }`}
              style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageName}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                  isLoading ? "opacity-0" : "opacity-100"
                }`}
                draggable={false}
                style={{ pointerEvents: "none" }}
                loading="eager"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          </div>

          {/* Floating Controls */}
          <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
            <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg text-sm font-mono backdrop-blur-sm">
              {Math.round(zoomLevel * 100)}%
            </div>

            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm"
                title="ซูมเข้า (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm"
                title="ซูมออก (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm"
                title="หมุนรูปภาพ (R)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm text-xs"
                title="พอดีกับหน้าจอ (0)"
              >
                ฟิต
              </button>
              <div className="h-px bg-gray-600 my-1"></div>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm"
                title="เปิดในแท็บใหม่"
              >
                <Eye className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-lg transition-all"
                title="ปิด"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

