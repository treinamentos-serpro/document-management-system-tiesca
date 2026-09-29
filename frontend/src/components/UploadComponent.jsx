import { useState } from 'react';
import { FileUp, UploadCloud } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ owner, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    setUploading(true);
    setError('');
    try {
      await uploadDocument(file, owner);
      form.reset();
      setFile(null);
      onUploaded();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="section-caption">
        <p className="eyebrow">NOVO DOCUMENTO</p>
        <h2 id="upload-title">Adicionar arquivo</h2>
        <p>Arquivos de até 10 MB.</p>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <UploadCloud size={22} strokeWidth={1.7} />
          <span className="file-picker-text">{file ? file.name : 'Escolher arquivo'}</span>
          <input type="file" name="file" aria-label="Escolher arquivo" disabled={uploading} onChange={(event) => { setFile(event.target.files[0] || null); setError(''); }} />
        </label>
        <button className="primary-button" type="submit" disabled={!file || uploading}><FileUp size={17} />{uploading ? 'Enviando...' : 'Enviar arquivo'}</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}