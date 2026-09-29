import React from 'react';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document, owner }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(document.id, owner);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="download-control">
      <button className="icon-button" type="button" onClick={handleDownload} disabled={downloading} title={`Baixar ${document.originalName}`} aria-label={`Baixar ${document.originalName}`}><Download size={18} /></button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </div>
  );
}