const errorHandler = (err, req, res, next) => {
  console.error("API Error:", err.message);

  // Default error
  let error = {
    success: false,
    error: "Internal server error",
  };

  // Handle specific error types
  if (err.message.includes("Failed to")) {
    error.error = err.message;
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    error.error = "Validation failed";
  }

  // Handle network errors
  if (err.code === "ECONNREFUSED") {
    error.error = "Unable to connect to LNbits service";
  }

  res.status(500).json(error);
};

module.exports = { errorHandler };
