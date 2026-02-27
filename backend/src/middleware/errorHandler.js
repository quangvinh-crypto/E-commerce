const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val) => val.message).join(', ') || 'Validation failed';
    error = { message, statusCode: 400 };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  if (err.name === 'CastError') {
    error = { message: 'Invalid resource ID format', statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
