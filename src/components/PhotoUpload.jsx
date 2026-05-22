import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Upload, X, Check, Loader, Crop, Scissors } from 'lucide-react';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return canvas;
};

// Compress canvas to target size (60-90 KB)
const compressToTarget = async (canvas, minSizeKB = 60, maxSizeKB = 90, maxAttempts = 10) => {
  let quality = 0.85;
  let blob = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
    const sizeKB = blob.size / 1024;

    if (sizeKB >= minSizeKB && sizeKB <= maxSizeKB) {
      break;
    }

    if (sizeKB > maxSizeKB) {
      quality -= 0.08;
    } else if (sizeKB < minSizeKB) {
      quality += 0.05;
    }

    quality = Math.max(0.1, Math.min(1, quality));
  }

  return blob;
};

const cropModalOverlay = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.95)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100000,
  padding: '10px',
};

const cropContainer = {
  position: 'relative',
  width: '100%',
  maxWidth: 500,
  height: 400,
  backgroundColor: '#000',
  borderRadius: 10,
  overflow: 'hidden',
};

const PhotoUpload = ({ label, value, onChange, accept = 'image/*', folder = 'worker-photos', aspect = 1 }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(value || '');
  const fileInputRef = useRef(null);

  // Crop state
  const [showCrop, setShowCrop] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropProcessing, setCropProcessing] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setCropSrc(localUrl);
    setShowCrop(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setCropSrc(null);
    URL.revokeObjectURL(cropSrc || '');
  };

  const handleCropSave = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setCropProcessing(true);

    try {
      // 1. Crop
      const canvas = await getCroppedImg(cropSrc, croppedAreaPixels);

      // 2. Compress to 60-90 KB
      const blob = await compressToTarget(canvas, 60, 90);

      // Show local preview
      const localUrl = URL.createObjectURL(blob);
      setPreview(localUrl);

      // Show final KB size
      const finalSizeKB = Math.round(blob.size / 1024);

      // 3. Upload to Firebase Storage
      setUploading(true);
      setProgress(0);

      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const storageRef = ref(storage, `${folder}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setPreview(downloadUrl);
      setUploading(false);
      setProgress(100);
      onChange(downloadUrl);

      // Cleanup
      URL.revokeObjectURL(cropSrc);
      setShowCrop(false);
      setCropSrc(null);
    } catch (error) {
      console.error('Crop/Upload error:', error);
      setUploading(false);
      setPreview(value || '');
      alert('Crop/Upload failed: ' + error.message);
    } finally {
      setCropProcessing(false);
    }
  };

  const handleClear = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>{label}</label>}

      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 120 }}>
          <img
            src={preview}
            alt={label || 'preview'}
            style={{
              width: '100%',
              height: 80,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid #222',
            }}
            onError={() => setPreview('')}
          />
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'rgba(0,0,0,0.7)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <X size={12} />
          </button>
          {uploading && (
            <div style={{
              position: 'absolute',
              bottom: 2,
              left: 2,
              right: 2,
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 10,
              color: '#00ff88',
              textAlign: 'center',
            }}>
              {progress}%
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 12px',
            border: '1px dashed #333',
            borderRadius: 6,
            cursor: 'pointer',
            color: uploading ? '#00ff88' : '#666',
            fontSize: 12,
            backgroundColor: '#050505',
            minHeight: 36,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#555'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
        >
          {uploading ? (
            <>
              <Loader size={14} className="spin" />
              Uploading... {progress}%
            </>
          ) : (
            <>
              <Scissors size={14} />
              {value ? 'Change Photo' : 'Select & Crop'}
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {value && !uploading && (
        <span style={{ fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={10} /> Uploaded
        </span>
      )}

      {/* Crop Modal */}
      {showCrop && cropSrc && (
        <div style={cropModalOverlay}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Crop size={16} /> CROP IMAGE
              </span>
              <span style={{ color: '#888', fontSize: 11 }}>Drag to adjust | Scroll to zoom</span>
            </div>

            <div style={cropContainer}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid
                style={{
                  containerStyle: { borderRadius: 10 },
                }}
              />
            </div>

            {/* Zoom slider */}
            <div style={{ marginTop: 10, marginBottom: 14 }}>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0055ff',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
                <span>Zoom: {zoom.toFixed(1)}x</span>
                <span>Target: ~60-90 KB</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleCropCancel}
                style={{
                  flex: 1,
                  backgroundColor: '#111',
                  color: '#888',
                  border: '1px solid #222',
                  padding: '12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                disabled={cropProcessing}
                style={{
                  flex: 1,
                  backgroundColor: '#0055ff',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 8,
                  cursor: cropProcessing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 12,
                  opacity: cropProcessing ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {cropProcessing ? (
                  <>
                    <Loader size={14} className="spin" />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <Crop size={14} /> CROP & UPLOAD
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;