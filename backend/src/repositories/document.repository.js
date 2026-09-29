const fs = require('node:fs');
const path = require('node:path');

// Metadados em memória + arquivos no filesystem local (nome interno = UUID).
function createDocumentRepository({ storageDir }) {
  fs.mkdirSync(storageDir, { recursive: true });
  const documents = new Map();

  const getFilePath = (id) => path.join(storageDir, path.basename(id));

  function save(document) {
    documents.set(document.id, { ...document });
    return { ...document };
  }

  function findByOwner(owner) {
    return [...documents.values()].filter((doc) => doc.owner === owner).map((doc) => ({ ...doc }));
  }

  function findById(id) {
    const document = documents.get(id);
    return document ? { ...document } : null;
  }

  // Retorna null quando o arquivo não existe mais no disco.
  async function openFile(id) {
    try {
      const handle = await fs.promises.open(getFilePath(id), 'r');
      return handle.createReadStream();
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async function removeFile(id) {
    await fs.promises.rm(getFilePath(id), { force: true });
  }

  return { save, findByOwner, findById, openFile, removeFile };
}

module.exports = { createDocumentRepository };
