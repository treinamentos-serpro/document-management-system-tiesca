const { validationError, notFoundError, fileTooLargeError } = require('./app-error');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function compareDocuments(a, b) {
  if (a.uploadedAt !== b.uploadedAt) return a.uploadedAt < b.uploadedAt ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function createDocumentService({ repository, now = () => new Date() }) {
  async function discardFile(id) {
    try {
      await repository.removeFile(id);
    } catch (error) {
      console.error('Falha ao remover arquivo descartado:', error.message);
    }
  }

  async function createDocument({ id, originalName, size, owner }) {
    if (!size || size <= 0) {
      await discardFile(id);
      throw validationError('O arquivo enviado está vazio.');
    }
    if (size > MAX_FILE_SIZE) {
      await discardFile(id);
      throw fileTooLargeError();
    }

    try {
      return repository.save({ id, originalName, size, uploadedAt: now().toISOString(), owner });
    } catch (error) {
      await discardFile(id);
      throw error;
    }
  }

  function listDocuments(owner) {
    return repository.findByOwner(owner).sort(compareDocuments);
  }

  // Documento inexistente e de outro dono produzem o mesmo 404.
  async function getDocumentForDownload(id, owner) {
    const document = repository.findById(id);
    if (!document || document.owner !== owner) throw notFoundError();

    const stream = await repository.openFile(id);
    if (!stream) throw notFoundError();

    return { document, stream };
  }

  return { createDocument, listDocuments, getDocumentForDownload };
}

module.exports = { createDocumentService, MAX_FILE_SIZE };
