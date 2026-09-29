import React from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ documents, owner, loading, error, onRetry }) {
  if (loading) return <div className="list-state" role="status">Carregando documentos...</div>;
  if (error) return <div className="list-state" role="alert">{error} <button type="button" className="text-button" onClick={onRetry}>Tentar novamente</button></div>;
  if (!documents.length) return <div className="list-state empty-state"><FolderOpen size={30} strokeWidth={1.5} /><strong>Nenhum documento por aqui</strong><span>Envie um arquivo para começar sua biblioteca.</span></div>;

  return (
    <div className="document-table">
      <div className="table-header" aria-hidden="true"><span>NOME</span><span>TAMANHO</span><span>ADICIONADO EM</span><span>AÇÃO</span></div>
      <ul className="document-rows">
        {documents.map((document) => (
          <li className="document-row" key={document.id}>
            <div className="document-name"><span className="file-icon"><FileText size={19} /></span><span className="filename" title={document.originalName}>{document.originalName}</span></div>
            <span className="document-meta">{formatSize(document.size)}</span>
            <span className="document-meta">{dateFormatter.format(new Date(document.uploadedAt))}</span>
            <DownloadButton document={document} owner={owner} />
          </li>
        ))}
      </ul>
    </div>
  );
}