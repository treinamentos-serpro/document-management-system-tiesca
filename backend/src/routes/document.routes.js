const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { validationError, fileTooLargeError } = require('../services/app-error');
const { MAX_FILE_SIZE } = require('../services/document.service');

function createUploadMiddleware(storageDir) {
  const storage = multer.diskStorage({
    destination: storageDir,
    // O nome interno é sempre um UUID gerado pelo servidor (nunca o nome original).
    filename: (req, file, cb) => cb(null, crypto.randomUUID()),
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 2 },
    defParamCharset: 'utf8',
  }).single('file');

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) return next();
      if (error.code === 'LIMIT_FILE_SIZE') return next(fileTooLargeError());
      // Erros de filesystem possuem "syscall"; os demais são de multipart inválido.
      if (error instanceof multer.MulterError || !error.syscall) {
        return next(validationError('Requisição de upload inválida.'));
      }
      next(error);
    });
  };
}

function createDocumentRouter({ controller, storageDir }) {
  const router = express.Router();

  router.post('/upload', controller.requireUserId, createUploadMiddleware(storageDir), controller.upload);
  router.get('/documents', controller.requireUserId, controller.list);
  router.get('/documents/:id/download', controller.requireUserId, controller.download);

  return router;
}

module.exports = { createDocumentRouter };
