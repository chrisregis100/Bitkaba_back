const express = require("express");
const router = express.Router();
const { getLnd } = require("../service/lnd");

// Middleware pour injecter lnd
router.use((req, res, next) => {
  req.lnd = getLnd();
  next();
});

const {
  getWalletInfo,
  getChainBalance,
  getChannelBalance,
  createInvoice,
  getInvoices,
  createHodlInvoice,
  subscribeToInvoice,
  settleHodlInvoice,
  pay,
  cancelInvoice,
  getInvoice,
} = require("ln-service");

// GET /getinfo
router.get("/getinfo", async (req, res) => {
  try {
    const info = await getWalletInfo({ lnd: req.lnd });
    res.json(info);
  } catch (error) {
    console.error("Error getting node info:", error);
    res.status(500).json({ error: "Failed to get node info.", details: error });
  }
});

// GET /balance
router.get("/balance", async (req, res) => {
  try {
    const onChainBalance = await getChainBalance({ lnd: req.lnd });
    const offChainBalance = await getChannelBalance({ lnd: req.lnd });
    res.json({ onChainBalance, offChainBalance });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ error: "Failed to get balance.", details: error });
  }
});

// POST /invoice
router.post("/invoice", async (req, res) => {
  try {
    const { sats, description } = req.body;
    console.log(req.body);

    if (sats === undefined || typeof sats !== "number" || sats <= 0) {
      return res
        .status(400)
        .json({ error: "A positive numeric `sats` value is required." });
    }

    const invoice = await createInvoice({
      lnd: req.lnd,
      tokens: sats,
      description: description || "",
    });
    res.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res
      .status(500)
      .json({ error: "Failed to create invoice.", details: error });
  }
});

// GET /invoices
router.get("/invoices", async (req, res) => {
  try {
    const { invoices } = await getInvoices({ lnd: req.lnd });
    res.json(invoices);
  } catch (error) {
    console.error("Error listing invoices:", error);
    res.status(500).json({ error: "Failed to list invoices.", details: error });
  }
});

// POST /pay
router.post("/pay", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res
        .status(400)
        .json({ error: "A `request` string (BOLT11 invoice) is required." });
    }
    const paymentResult = await pay({ lnd: req.lnd, request });
    res.json({ success: true, payment_info: paymentResult });
  } catch (error) {
    console.error("Error paying invoice:", error);
    res.status(500).json({ error: "Failed to pay invoice.", details: error });
  }
});

// POST /holdinvoice
router.post("/holdinvoice", async (req, res) => {
  try {
    const { amount, description, timestamp } = req.body;
    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      return res
        .status(400)
        .json({ error: "A positive numeric `amount` value is required." });
    }

    const invoice = await createHodlInvoice({
      lnd: req.lnd,
      tokens: amount,
      description: description || "",
      expires_at: timestamp
        ? new Date(timestamp).toISOString()
        : new Date(Date.now() + 3600000).toISOString(),
    });

    res.json({ invoice });
  } catch (error) {
    console.error("Error creating hold invoice:", error);
    res
      .status(500)
      .json({ error: "Failed to create hold invoice.", details: error });
  }
});

// POST /settleholdinvoice
router.post("/settleholdinvoice", async (req, res) => {
  try {
    const { id, secret } = req.body;
    if (!id || !secret) {
      return res
        .status(400)
        .json({ error: "Both `id` and `secret` are required." });
    }

    const sub = subscribeToInvoice({ lnd: req.lnd, id });
    let responded = false;

    sub.on("invoice_updated", async (invoice) => {
      if (responded) return;

      if (!invoice.is_held) {
        responded = true;
        sub.removeAllListeners();
        return res.status(400).json({ error: "Invoice is not held." });
      }

      if (invoice.is_confirmed) {
        responded = true;
        sub.removeAllListeners();
        return res.status(400).json({ error: "Invoice already settled." });
      }

      try {
        const settled = await settleHodlInvoice({ lnd: req.lnd, secret });
        responded = true;
        sub.removeAllListeners();
        res.json({ success: true, settled });
      } catch (err) {
        responded = true;
        sub.removeAllListeners();
        res
          .status(500)
          .json({ error: "Failed to settle hold invoice.", details: err });
      }
    });
  } catch (error) {
    console.error("Error settling hold invoice:", error);
    res
      .status(500)
      .json({ error: "Failed to settle hold invoice.", details: error });
  }
});

// POST /cancel-invoice
router.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;
  try {
    await cancelInvoice({ lnd: req.lnd, id });
    res.json({ message: "Invoice cancelled" });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res
      .status(500)
      .json({ error: "Failed to cancel invoice.", details: error });
  }
});

// GET /invoice/:id
router.get("/invoice/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await getInvoice({ lnd: req.lnd, id });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice.", details: error });
  }
});

module.exports = router;
