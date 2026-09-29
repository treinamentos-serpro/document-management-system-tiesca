const API_BASE = '/api';

async function request(path, owner, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...options.headers, 'X-User-Id': owner },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a solicitação.');
  }

  return response;
}

export async function listDocuments(owner) {
  const response = await request('/documents', owner);
  const { documents } = await response.json();
  return documents;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', owner, { method: 'POST', body: formData });
  const { document } = await response.json();
  return document;
}

export async function downloadDocument(id, owner) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, owner);
  return response.blob();
}