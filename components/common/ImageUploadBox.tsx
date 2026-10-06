'use client';

import React, { useState, useRef } from 'react';
import { compressImageFile } from '@/lib/image-utils';
import { Camera, Image as ImageIcon, Trash2, Upload, ZoomIn, X, RefreshCw } from 'lucide-react';

interface ImageUploadBoxProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  placeholderText?: string;
  heightClass?: string;
  compact?: boolean;
  disabled?: boolean;
  showPreviewModal?: boolean;
}

export function ImageUploadBox({
  value,
  onChange,
  label,
  placeholderText = 'Tải ảnh minh họa / bản vẽ 3D',
  heightClass = 'h-44',
  compact = false,
  disabled = false,
  showPreviewModal = true,
}: ImageUploadBoxProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const compressed = await compressImageFile(file, 800, 0.82);
      onChange(compressed);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
      setIsProcessing(true);
      const compressed = await compressImageFile(file, 800, 0.82);
      onChange(compressed);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(undefined);
  };

  const handleTriggerUpload = () => {
    if (disabled || isProcessing) return;
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
        />

        {value ? (
          <div
            className="group relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs shrink-0 cursor-pointer"
            onClick={() => setIsPreviewOpen(true)}
          >
            <img src={value} alt="Thumbnail" className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerUpload();
                  }}
                  className="p-1 text-white hover:text-amber-400"
                  title="Đổi ảnh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 text-white hover:text-red-400"
                  title="Xóa ảnh"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={handleTriggerUpload}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-amber-700 transition-colors shrink-0"
            title="Bấm để tải ảnh đồ nội thất"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[9px] font-bold mt-0.5">+ Ảnh</span>
          </button>
        )}

        {/* Modal phóng to ảnh */}
        {isPreviewOpen && value && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div
              className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 bg-slate-900 flex items-center justify-between text-white border-b border-slate-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  Xem ảnh chi tiết
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 bg-slate-950 flex items-center justify-center">
                <img src={value} alt="Preview full" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {value && !disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa ảnh</span>
            </button>
          )}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {value ? (
        <div
          className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 group cursor-pointer shadow-inner`}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={() => {
            if (showPreviewModal) setIsPreviewOpen(true);
            else handleTriggerUpload();
          }}
        >
          <img src={value} alt="Furniture illustration" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

          {/* Overlay thao tác khi hover */}
          <div
            className={`absolute inset-0 bg-slate-950/60 backdrop-blur-2xs transition-opacity flex items-center justify-center gap-2 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {showPreviewModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Xem lớn</span>
              </button>
            )}

            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerUpload();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi ảnh</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Vùng kéo thả hoặc click upload ảnh */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleTriggerUpload}
          className={`w-full ${heightClass} rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer ${
            isDragging
              ? 'border-amber-500 bg-amber-50/70'
              : 'border-slate-200 hover:border-amber-500/80 bg-slate-50/60 hover:bg-amber-50/20'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Đang nén & tải ảnh...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 group-hover:text-amber-600 flex items-center justify-center mb-2 shadow-2xs">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-700">{placeholderText}</span>
              <span className="text-[11px] text-slate-400 mt-1">
                Kéo thả file ảnh vào đây hoặc <strong className="text-amber-700 underline font-semibold">bấm chọn từ máy</strong>
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Tự động nén tối ưu)</span>
            </>
          )}
        </div>
      )}

      {/* Modal xem ảnh lớn */}
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-900 flex items-center justify-between text-white border-b border-slate-800">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Ảnh minh họa / Bản vẽ 3D
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center">
              <img src={value} alt="Preview full" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
