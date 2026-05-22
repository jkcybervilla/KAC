import React, { useState } from 'react';
import { Download, X, ExternalLink } from 'lucide-react';

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.92)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 99999,
  padding: '20px',
};

const modalContentStyle = {
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const PhotoCellRenderer = ({ src, alt = 'photo', size = 36, rounded = true, label }) => {
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt.replace(/\s+/g, '_') + '.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback: open in new tab and user can save manually
      window.open(src, '_blank');
    }
  };

  if (!src) {
    return <span style={{ color: '#555', fontSize: 10 }}>—</span>;
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer', display: 'inline-block', lineHeight: 0 }}
        title="Click to view full size"
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: size,
            height: size,
            borderRadius: rounded ? '50%' : 4,
            objectFit: 'cover',
            border: '1px solid #222',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'inline';
          }}
        />
        <span style={{ display: 'none', color: '#555', fontSize: 10 }}>!</span>
      </div>

      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginBottom: 12,
              }}
            >
              <span style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>
                {label || alt}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  title="Download image"
                >
                  <Download size={14} /> DOWNLOAD
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                  }}
                  title="Close"
                >
                  <X size={14} /> CLOSE
                </button>
              </div>
            </div>

            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 8,
                objectFit: 'contain',
                border: '1px solid #222',
              }}
            />

            <div style={{ marginTop: 10, color: '#666', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={12} />
              Click outside or press Close to exit
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoCellRenderer;