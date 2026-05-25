import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Upload, X, Check, Loader, Crop, Scissors } from 'lucide-react';

// Reliable: uses regular canvas + Image element (works in all browsers)
const cropToBlob = (src, crop, maxDim = 500, quality = 0.6) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(maxDim / crop.width, maxDim / crop.height, 1);
      const tw = Math.round(crop.width * s);
      const th = Math.round(crop.height * s);
      const c = document.createElement('canvas');
      c.width = tw;
      c.height = th;
      c.getContext('2d').drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, tw, th);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = URL.createObjectURL(src);
  });

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
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Crop state
  const [showCrop, setShowCrop] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropProcessing, setCropProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // original File for crop processing

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e, fromCamera = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setCropSrc(localUrl);
    setShowCrop(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setShowPicker(false);
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
      // 1. Crop + compress
      const blob = await cropToBlob(selectedFile, croppedAreaPixels);

      // 2. Local preview — modal still shows while uploading
      const localUrl = URL.createObjectURL(blob);
      setPreview(localUrl);

      // 3. Upload to Firebase Storage
      setUploading(true);

      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const storageRef = ref(storage, `${folder}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // 4. Done — update form state with permanent URL, close modal
      setPreview(downloadUrl);
      setUploading(false);
      setCropProcessing(false);
      setShowCrop(false);
      setCropSrc(null);
      onChange(downloadUrl);

      URL.revokeObjectURL(cropSrc);
    } catch (error) {
      console.error('Crop/upload error:', error);
      setUploading(false);
      setCropProcessing(false);
      setPreview(value || '');
      alert('Photo upload failed. Please try again.\n' + error.message);
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
        <>
          <div
            onClick={() => setShowPicker(true)}
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

          {/* Camera / Gallery Picker Modal */}
          {showPicker && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.9)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100001,
            }}>
              <div style={{
                backgroundColor: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: 16,
                padding: 24,
                maxWidth: 340,
                width: '90%',
                textAlign: 'center',
              }}>
                <h4 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 16 }}>
                  CHOOSE PHOTO SOURCE
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                      backgroundColor: '#111',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '14px 20px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    📷 TAKE PHOTO (CAMERA)
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: '#111',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '14px 20px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    🖼️ SELECT FROM GALLERY
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPicker(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#666',
                      padding: '10px',
                      cursor: 'pointer',
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden file input for gallery select */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, false)}
        disabled={uploading}
      />

      {/* Hidden file input for camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, true)}
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