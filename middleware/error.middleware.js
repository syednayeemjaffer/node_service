const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource id",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Email already exists",
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error",
  });
};

module.exports = {
  notFound,
  errorHandler,
};
