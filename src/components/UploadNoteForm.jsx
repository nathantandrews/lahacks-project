import { useRef, useState } from 'react';
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

export default function UploadNoteForm({ currentDate, onSubmit, onCancel, loading }) {
  const [author, setAuthor] = useState('Dr. Chen');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || loading) return;
    setUploadError(null);
    try {
      await onSubmit({
        file,
        author: author.trim() || 'Doctor',
        weekOf: isoMondayOf(currentDate),
      });
    } catch (err) {
      setUploadError(err.message);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Author</label>
        <input
          className={styles.input}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Dr. Chen"
          disabled={loading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Source</label>
        <div className={styles.uploadOptions}>
          <button
            type="button"
            className={styles.uploadOption}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <span className={styles.uploadIcon} aria-hidden>📄</span>
            Upload a file
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
            {!loading && (
              <button
                type="button"
                className={styles.uploadRemove}
                onClick={() => { setFile(null); setPreviewUrl(null); }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className={styles.submit} disabled={!file || loading}>
          {loading ? 'Analyzing with AI...' : 'Upload note'}
        </button>
      </div>
      {uploadError && (
        <div style={{ marginTop: '12px', padding: '8px', borderRadius: '6px', background: '#fff5f5', color: '#c53030', fontSize: '12px', textAlign: 'center', border: '1px solid #feb2b2' }}>
          <strong>Error:</strong> {uploadError}
        </div>
      )}
      {loading && (
        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#4a78c4' }}>
          This may take a moment while we OCR and analyze the document...
        </div>
      )}
    </form>
  );
}

