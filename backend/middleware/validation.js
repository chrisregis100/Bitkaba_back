const validateInvoiceCreation = (req, res, next) => {
  const { amount, memo, expiry } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "Valid amount (> 0) is required",
    });
  }

  if (amount > 1000000) {
    // 1M sats limit for demo
    return res.status(400).json({
      success: false,
      error: "Amount too large (max 1,000,000 sats)",
    });
  }

  if (expiry && (expiry < 60 || expiry > 86400)) {
    return res.status(400).json({
      success: false,
      error: "Expiry must be between 60 seconds and 24 hours",
    });
  }

  next();
};

const validatePayment = (req, res, next) => {
  const { bolt11 } = req.body;

  if (!bolt11) {
    return res.status(400).json({
      success: false,
      error: "bolt11 invoice is required",
    });
  }

  if (
    !bolt11.toLowerCase().startsWith("lnbc") &&
    !bolt11.toLowerCase().startsWith("lntb")
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid Lightning invoice format",
    });
  }

  next();
};

module.exports = {
  validateInvoiceCreation,
  validatePayment,
};
