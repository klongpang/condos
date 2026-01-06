"use client";

import React, { useState, useCallback, useRef } from "react";
import { File, Eye, ZoomIn, ZoomOut, RotateCw, X, Loader2 } from "lucide-react";
import { Modal } from "./modal";
import type { Document } from "@/lib/supabase";

interface DocumentPreviewProps {
  documents: Document[];
  documentTypes: { value: string; label: string }[];
  loading?: boolean;
  onDeleteDocument?: (docId: string, fileUrl: string, docName: string) => void;
  title?: string;
  maxColumns?: 1 | 2 | 3;
}

export function DocumentPreview({
  documents,
  documentTypes,
  loading = false,
  onDeleteDocument,
  title = "เอกสาร",
  maxColumns = 2,
}: DocumentPreviewProps) {
  // Add custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: #1f2937;
        border-radius: 3px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 3px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Preview image modal state
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [previewImageName, setPreviewImageName] = useState<string>("");

  // Zoom and rotation state
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [rotation, setRotation] = useState(0);

  // Drag state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Loading state for preview
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  
  // Check if file is an image
  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  };

  // Open image preview
  const openImagePreview = (doc: Document) => {
    if (doc.file_url && isImageFile(doc.name)) {
      setPreviewImageUrl(doc.file_url);
      setPreviewImageName(doc.name);
      setZoomLevel(1);
      setRotation(0);
      setDragOffset({ x: 0, y: 0 }); // Reset drag position
      setIsPreviewLoading(true);
      setPreviewError(false);
      setIsImagePreviewOpen(true);
    }
  };

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 0.25, 3); // Max 3x zoom
      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 0.5); // Min 0.5x zoom
      return newZoom;
    });
  }, []);

  // Fit to screen function
  const fitToScreen = useCallback(() => {
    setZoomLevel(1);
    setRotation(0);
    setDragOffset({ x: 0, y: 0 }); // Reset drag position
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const resetZoom = fitToScreen;

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel >= 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
      e.preventDefault();
    }
  }, [zoomLevel, dragOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setDragOffset(newOffset);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard shortcuts for image navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isImagePreviewOpen) return;

      switch (event.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
        case '0':
          fitToScreen();
          break;
        case 'Escape':
          setIsImagePreviewOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImagePreviewOpen, handleZoomIn, handleZoomOut, handleRotate, fitToScreen]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">ไม่มีเอกสาร</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          {title} ({documents.length} ไฟล์):
        </h4>
        <div
          className={`grid gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 ${
            maxColumns === 1 ? 'grid-cols-1 max-h-40' :
            maxColumns === 2 ? 'grid-cols-1 md:grid-cols-2 max-h-72' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-96'
          }`}
        >
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {/* Thumbnail or file icon */}
                <div className="flex-shrink-0">
                  {doc.file_url && isImageFile(doc.name) ? (
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImagePreview(doc)}
                      title="คลิกเพื่อดูรูปภาพ"
                    >
                      <img
                        src={doc.file_url}
                        alt={doc.name}
                        className="w-16 h-16 object-cover rounded border border-gray-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center border border-gray-500">
                      <File className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-white truncate block font-medium">
                        {doc.name}
                      </span>
                      <span className="text-xs text-gray-400 block mt-1">
                        {documentTypes.find(
                          (t) => t.value === doc.document_type
                        )?.label ||
                          doc.document_type ||
                          "ไม่ระบุประเภท"}
                      </span>
                      {isImageFile(doc.name) && (
                        <span className="text-xs text-green-400 block mt-1">
                          คลิกที่รูปเพื่อดูขนาดใหญ่
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-2 mt-2">
                    {doc.file_url && (
                      <>
                        {isImageFile(doc.name) ? (
                          <button
                            type="button"
                            onClick={() => openImagePreview(doc)}
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center"
                            title="ดูรูปภาพ"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            ดูรูป
                          </button>
                        ) : (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center"
                            title="ดู/ดาวน์โหลด"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            ดูไฟล์
                          </a>
                        )}
                      </>
                    )}
                    {onDeleteDocument && (
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteDocument(
                            doc.id,
                            doc.file_url || "",
                            doc.name
                          )
                        }
                        className="text-red-400 hover:text-red-300 text-xs flex items-center"
                        title="ลบเอกสาร"
                      >
                        <X className="h-3 w-3 mr-1" />
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Preview Modal */}
      <Modal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        title=""
        size="xl"
        showCloseButton={false}
      >
        <div className="w-full h-screen max-h-[75vh] flex flex-col bg-black">
          {/* Title Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-700">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-white truncate">
                {previewImageName}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {documentTypes.find(
                  (t) => t.value === documents.find(d => d.file_url === previewImageUrl)?.document_type
                )?.label ||
                  documents.find(d => d.file_url === previewImageUrl)?.document_type ||
                  "ไม่ระบุประเภท"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsImagePreviewOpen(false)}
              className="ml-4 p-2 text-gray-400 hover:text-white transition-colors"
              title="ปิด (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image Display Area - Full Screen */}
          <div
            className="flex-1 overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
              cursor: isDragging && zoomLevel >= 1 ? 'grabbing' : zoomLevel >= 1 ? 'grab' : 'default',
              userSelect: 'none'
            }}
          >
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              {/* Loading Overlay */}
              {isPreviewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                    <span className="text-gray-400 text-sm">กำลังโหลดภาพ...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {previewError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <X className="h-10 w-10 text-red-500" />
                    <span className="text-gray-400 text-sm">ไม่สามารถโหลดภาพได้</span>
                    <button
                      onClick={() => {
                        setPreviewError(false);
                        setIsPreviewLoading(true);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      ลองใหม่
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`relative w-full h-full flex items-center justify-center ${isDragging ? '' : 'transition-transform duration-200 ease-in-out'}`}
                style={{
                  transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageUrl}
                  alt={previewImageName}
                  className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                    isPreviewLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  draggable={false}
                  style={{ pointerEvents: 'none' }}
                  onLoad={() => setIsPreviewLoading(false)}
                  onError={() => {
                    setIsPreviewLoading(false);
                    setPreviewError(true);
                  }}
                />
              </div>
            </div>

            {/* Floating Controls */}
            <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
              {/* Zoom indicator */}
              <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg text-sm font-mono backdrop-blur-sm">
                {Math.round(zoomLevel * 100)}%
              </div>

              {/* Control buttons */}
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
                  href={previewImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all backdrop-blur-sm"
                  title="เปิดในแท็บใหม่"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsImagePreviewOpen(false)}
                  className="p-2 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-lg transition-all"
                  title="ปิด (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}