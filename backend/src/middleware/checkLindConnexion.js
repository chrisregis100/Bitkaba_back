const checkLndConnection = (req, res, next) => {
  if (!lnd) {
    return res
      .status(503)
      .json({ error: "LND service is unavailable. Check server logs." });
  }
  // Pass the lnd object in the request for easy access in routes
  req.lnd = lnd;
  next();
};

module.exports = checkLndConnection;
