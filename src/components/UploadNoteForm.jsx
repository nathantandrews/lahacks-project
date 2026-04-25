import { useEffect, useRef, useState } from 'react';
import styles from './Form.module.css';

function isoMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function shortDate(date) {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function UploadNoteForm({ currentDate, onSubmit, onCancel }) {
  const [author, setAuthor] = useState('Dr. Chen');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => stopStream, []);

  const openCamera = async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(err?.message || 'Could not access camera');
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const photoFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(photoFile);
        setPreviewUrl(dataUrl);
        closeCamera();
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleFileSelected = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      try {
        setPreviewUrl(await readAsDataUrl(f));
      } catch {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    onSubmit({
      id: `n-${Date.now()}`,
      weekOf: isoMondayOf(currentDate),
      author: author.trim() || 'Doctor',
      date: shortDate(new Date()),
      fileName: file.name,
      ...(previewUrl ? { imageUrl: previewUrl } : {}),
      body: `Attached: ${file.name}`,
    });
  };

  if (cameraOpen) {
    return (
      <div className={styles.form}>
        <div className={styles.cameraStage}>
          {cameraError ? (
            <div className={styles.cameraError}>{cameraError}</div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.cameraVideo}
            />
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={closeCamera}>Cancel</button>
          <button
            type="button"
            className={styles.submit}
            onClick={capturePhoto}
            disabled={!!cameraError}
          >
            Capture
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Author</label>
        <input
          className={styles.input}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Dr. Chen"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Source</label>
        <div className={styles.uploadOptions}>
          <button
            type="button"
            className={styles.uploadOption}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.uploadIcon} aria-hidden>📄</span>
            Upload a file
          </button>
          <button
            type="button"
            className={styles.uploadOption}
            onClick={openCamera}
          >
            <span className={styles.uploadIcon} aria-hidden>📷</span>
            Take photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,image/*"
          hidden
          onChange={handleFileSelected}
        />
      </div>
      {file && (
        <div className={styles.field}>
          <label className={styles.label}>Selected</label>
          <div className={styles.uploadPreview}>
            {previewUrl ? (
              <img src={previewUrl} alt="" className={styles.uploadThumb} />
            ) : (
              <span className={styles.uploadIcon} aria-hidden>📄</span>
            )}
            <span className={styles.uploadName}>{file.name}</span>
            <button
              type="button"
              className={styles.uploadRemove}
              onClick={() => { setFile(null); setPreviewUrl(null); }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit} disabled={!file}>Upload note</button>
      </div>
    </form>
  );
}
