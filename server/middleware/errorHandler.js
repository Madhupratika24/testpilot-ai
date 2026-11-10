export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const body = { message: err.message || "Something went wrong" };

  if (process.env.NODE_ENV !== "production") {
    body.stack = err.stack;
  }
  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") {
      body.message = "Internal server error";
    }
  }
  res.status(status).json(body);
}