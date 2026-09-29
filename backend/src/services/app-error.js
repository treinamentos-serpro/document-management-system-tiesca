// Erro de aplicação com status HTTP e código público, sem detalhes internos.
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

const validationError = (message) => new AppError(400, 'VALIDATION_ERROR', message);
const notFoundError = () => new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
const fileTooLargeError = () => new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite de 10 MiB.');

module.exports = { AppError, validationError, notFoundError, fileTooLargeError };
