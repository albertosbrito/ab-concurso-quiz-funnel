export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: 'not_found',
    message: 'Rota não encontrada.'
  });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.code || 'internal_error',
    message: err.publicMessage || err.message || 'Erro interno.'
  });
}

export function badRequest(message, code = 'bad_request') {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  error.publicMessage = message;
  return error;
}
