import { useEffect, useState } from 'react';
import { ArrowRight, Files, RefreshCw } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState('');
  const [activeUser, setActiveUser] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!activeUser) return;

    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(activeUser, controller.signal)
      .then((items) => {
        setDocuments(items);
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeUser, refreshIndex]);

  function selectUser(event) {
    event.preventDefault();
    const owner = userId.trim();
    if (!owner) return;
    setActiveUser(owner);
    setDocuments([]);
    setRefreshIndex((index) => index + 1);
  }

  function refreshDocuments() {
    setRefreshIndex((index) => index + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Files size={19} strokeWidth={2.2} /></span> arquivo<span className="brand-dot">.</span></div>
        <span className="topbar-label">GESTÃO DE DOCUMENTOS</span>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SEU ESPAÇO DE TRABALHO</p>
            <h1>Documentos</h1>
            <p className="page-subtitle">Um lugar para guardar e encontrar seus arquivos.</p>
          </div>
          {activeUser && <span className="account-badge">Usuário <strong>{activeUser}</strong></span>}
        </div>

        <section className="identity-section" aria-label="Identificação">
          <div className="section-caption">
            <h2>Identificação</h2>
            <p>Informe seu identificador para acessar seus documentos.</p>
          </div>
          <form className="identity-form" onSubmit={selectUser}>
            <label className="sr-only" htmlFor="user-id">Identificador do usuário</label>
            <input id="user-id" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Seu identificador" required />
            <button className="primary-button" type="submit">Acessar <ArrowRight size={17} /></button>
          </form>
        </section>

        {activeUser ? (
          <>
            <UploadComponent key={activeUser} owner={activeUser} onUploaded={refreshDocuments} />
            <section className="documents-section" aria-labelledby="documents-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BIBLIOTECA</p>
                  <h2 id="documents-title">Seus arquivos <span className="document-count">{documents.length}</span></h2>
                </div>
                <button className="icon-button" type="button" onClick={refreshDocuments} disabled={loading} title="Atualizar lista" aria-label="Atualizar lista"><RefreshCw size={18} /></button>
              </div>
              <DocumentList documents={documents} owner={activeUser} loading={loading} error={error} onRetry={refreshDocuments} />
            </section>
          </>
        ) : (
          <section className="welcome-state"><Files size={30} strokeWidth={1.5} /><h2>Seus arquivos, em um só lugar.</h2><p>Identifique-se acima para começar.</p></section>
        )}
      </main>
    </div>
  );
}
