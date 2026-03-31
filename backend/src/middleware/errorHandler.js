const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: err.errors },
    });
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ressource introuvable' },
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: { code: 'DUPLICATE', message: 'Ressource déjà existante' },
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: { code: 'SERVER_ERROR', message: err.message || 'Erreur serveur interne' },
  });
};

module.exports = errorHandler;
