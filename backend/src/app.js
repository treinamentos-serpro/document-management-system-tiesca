// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const path = require('node:path');
const express = require('express');
const { createDocumentRepository } = require('./repositories/document.repository');
const { createDocumentService } = require('./services/document.service');
const { createDocumentController, errorHandler } = require('./controllers/document.controller');
const { createDocumentRouter } = require('./routes/document.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage');

const repository = createDocumentRepository({ storageDir: STORAGE_DIR });
const service = createDocumentService({ repository });
const controller = createDocumentController({ service });

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(createDocumentRouter({ controller, storageDir: STORAGE_DIR }));
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
