import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DocumentList from '../src/components/DocumentList.jsx';

function renderList(props = {}) {
  return renderToStaticMarkup(
    <DocumentList documents={[]} owner="user-1" loading={false} error="" onRetry={() => {}} {...props} />,
  );
}

test('exibe o estado de carregamento', () => {
  const markup = renderList({ loading: true });

  assert.match(markup, /role="status"/);
  assert.match(markup, /Carregando documentos\.\.\./);
});

test('exibe o erro e a ação para tentar novamente', () => {
  const markup = renderList({ error: 'Falha ao carregar documentos.' });

  assert.match(markup, /role="alert"/);
  assert.match(markup, /Falha ao carregar documentos\./);
  assert.match(markup, /Tentar novamente/);
  assert.match(markup, /type="button"/);
});

test('exibe o estado vazio quando não há documentos', () => {
  const markup = renderList();

  assert.match(markup, /Nenhum documento por aqui/);
  assert.match(markup, /Envie um arquivo para começar sua biblioteca\./);
  assert.doesNotMatch(markup, /document-table/);
});

test('exibe os dados dos documentos quando a lista não está vazia', () => {
  const markup = renderList({
    documents: [{
      id: 'document-1',
      originalName: 'relatorio.pdf',
      size: 2048,
      uploadedAt: '2026-01-15T12:00:00.000Z',
    }],
  });

  assert.match(markup, /document-table/);
  assert.match(markup, /relatorio\.pdf/);
  assert.match(markup, /2\.0 KB/);
  assert.match(markup, /Baixar relatorio\.pdf/);
  assert.doesNotMatch(markup, /Nenhum documento por aqui/);
});