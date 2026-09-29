const { pipeline } = require('node:stream');
const { AppError, validationError } = require('../services/app-error');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createDocumentController({ service }) {
  // Deve rodar antes do multer para não gravar arquivos de requisições inválidas.
  function requireUserId(req, res, next) {
    const owner = (req.get('X-User-Id') || '').trim();
    if (!owner) return next(validationError('Informe o header X-User-Id.'));
    req.owner = owner;
    next();
  }

  async function upload(req, res) {
    if (!req.file) throw validationError('Envie um arquivo no campo "file".');

    const document = await service.createDocument({
      id: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      owner: req.owner,
    });
    res.status(201).json({ document });
  }

  function list(req, res) {
    res.json({ documents: service.listDocuments(req.owner) });
  }

  async function download(req, res) {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) throw validationError('Identificador de documento inválido.');

    const { document, stream } = await service.getDocumentForDownload(id.toLowerCase(), req.owner);

    res.attachment(document.originalName);
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Length', String(document.size));
    pipeline(stream, res, (error) => {
      if (error) console.error('Falha ao transmitir download:', error.message);
    });
  }

  return { requireUserId, upload, list, download };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Corpo da requisição inválido.' } });
  }

  console.error('Erro inesperado:', error);
  if (res.headersSent) return res.end();
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
}

module.exports = { createDocumentController, errorHandler };
