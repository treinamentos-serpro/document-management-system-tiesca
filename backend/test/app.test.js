const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');
const { createDocumentRepository } = require('../src/repositories/document.repository');
const { createDocumentService } = require('../src/services/document.service');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('o repositório rejeita identificadores que não são UUID', async () => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-repository-'));
  const repository = createDocumentRepository({ storageDir });

  await assert.rejects(repository.openFile('../outside'), TypeError);
  await assert.rejects(repository.removeFile('../outside'), TypeError);

  fs.rmSync(storageDir, { recursive: true, force: true });
});

test('o service impede download por outro proprietário', async () => {
  const repository = {
    findById: () => ({ id: 'document-id', owner: 'owner-a' }),
  };
  const service = createDocumentService({ repository });

  await assert.rejects(
    service.getDocumentForDownload('document-id', 'owner-b'),
    (error) => error.status === 404 && error.code === 'DOCUMENT_NOT_FOUND',
  );
});

test('a API isola proprietários e rejeita traversal no download', async (t) => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-api-'));
  const server = http.createServer(app.createApp({ storageDir }));
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => {
    server.close();
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const emptyListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'owner-a' },
  });
  assert.strictEqual(emptyListResponse.status, 200);
  assert.deepStrictEqual((await emptyListResponse.json()).documents, []);

  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'teste.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'owner-a' },
    body: form,
  });
  const uploadBody = await uploadResponse.json();
  assert.strictEqual(uploadResponse.status, 201, JSON.stringify(uploadBody));
  const { document } = uploadBody;

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'owner-a' },
  });
  assert.strictEqual(listResponse.status, 200);
  const listedDocuments = (await listResponse.json()).documents;
  assert.strictEqual(listedDocuments.length, 1);
  assert.strictEqual(listedDocuments[0].id, document.id);
  assert.strictEqual(listedDocuments[0].originalName, 'teste.txt');
  assert.strictEqual(listedDocuments[0].size, Buffer.byteLength('conteudo de teste'));

  const otherOwnerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'owner-b' },
  });
  assert.strictEqual(otherOwnerListResponse.status, 200);
  assert.deepStrictEqual((await otherOwnerListResponse.json()).documents, []);

  const otherOwnerResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'owner-b' },
  });
  assert.strictEqual(otherOwnerResponse.status, 404);

  const traversalResponse = await fetch(`${baseUrl}/documents/${encodeURIComponent('../outside')}/download`, {
    headers: { 'X-User-Id': 'owner-a' },
  });
  assert.strictEqual(traversalResponse.status, 400);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'owner-a' },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});
