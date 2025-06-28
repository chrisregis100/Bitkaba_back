// index.js

// --- 1. DEPENDENCIES AND INITIALIZATION ---
const express = require("express");
// The ln-service package provides higher-level functions and also exports authenticatedLndGrpc
const { authenticatedLndGrpc } = require("ln-service");
const dotenv = require("dotenv");
const cors = require("cors");
// We need to import the methods we'll use from ln-service
const {
  getWalletInfo,
  getChainBalance,
  getChannelBalance,
  createInvoice,
  getInvoices,
  createHodlInvoice,
  settleHodlInvoice,
  pay,
} = require("ln-service");

const crypto = require("crypto");
// Load environment variables from a .env file
dotenv.config();

// Create an Express application
const app = express();

// --- 2. MIDDLEWARE CONFIGURATION ---
app.use(cors());
app.use(express.json());

// --- 3. LND CONNECTION SETUP ---
let lnd; // This will hold our authenticated LND gRPC client

/**
 * Connects to the LND node using credentials from the .env file.
 * ln-service, like the lightning package, requires base64 encoded credentials.
 */
function connectToLnd() {
  try {
    // Retrieve LND connection details from environment variables
    const socket = process.env.LND_GRPC_HOST;
    const macaroon = process.env.LND_MACAROON_BASE64;
    const cert = process.env.LND_TLS_CERT_BASE64;

    // --- Input Validation ---
    if (!socket || !macaroon || !cert) {
      console.error("LND connection details are missing in the .env file.");
      console.error(
        "Please provide LND_GRPC_HOST, LND_MACAROON_BASE64, and LND_TLS_CERT_BASE64."
      );
      process.exit(1);
    }

    // The authenticatedLndGrpc function returns the authenticated LND object
    const { lnd: authenticatedLnd } = authenticatedLndGrpc({
      socket,
      macaroon,
      cert,
    });

    lnd = authenticatedLnd;
    console.log("Successfully authenticated with LND node via ln-service!");
  } catch (error) {
    console.error("Failed to connect to LND:", error.message);
    process.exit(1);
  }
}

// --- 4. API ENDPOINTS / ROUTES ---

// Middleware to check if the LND connection is established
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

app.use(checkLndConnection);

/**
 * @route   GET /api/getinfo
 * @desc    Get general information about the LND node.
 */
app.get("/api/getinfo", async (req, res) => {
  try {
    const info = await getWalletInfo({ lnd: req.lnd });
    res.json(info);
  } catch (error) {
    console.error("Error getting node info:", error);
    res.status(500).json({ error: "Failed to get node info.", details: error });
  }
});

/**
 * @route   GET /api/balance
 * @desc    Get the on-chain and off-chain (channel) balances.
 */
app.get("/api/balance", async (req, res) => {
  try {
    const onChainBalance = await getChainBalance({ lnd: req.lnd });
    const offChainBalance = await getChannelBalance({ lnd: req.lnd });
    res.json({
      onChainBalance,
      offChainBalance,
    });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ error: "Failed to get balance.", details: error });
  }
});

/**
 * @route   POST /api/invoice
 * @desc    Create a new Lightning invoice.
 * @body    { sats: number, description: string }
 */
app.post("/api/invoice", async (req, res) => {
  try {
    const { sats, description } = req.body;

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

/**
 * @route   GET /api/invoices
 * @desc    List all invoices.
 */
app.get("/api/invoices", async (req, res) => {
  try {
    const { invoices } = await getInvoices({ lnd: req.lnd });
    res.json(invoices);
  } catch (error) {
    console.error("Error listing invoices:", error);
    res.status(500).json({ error: "Failed to list invoices.", details: error });
  }
});

/**
 * @route   POST /api/pay
 * @desc    Pay a Lightning invoice (payment request string).
 * @body    { request: string }
 */
app.post("/api/pay", async (req, res) => {
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

app.get("/api/getinfo", async (req, res) => {
  try {
    const info = await getWalletInfo({ lnd: req.lnd });
    res.json(info);
  } catch (error) {
    console.error("Error getting node info:", error);
    res.status(500).json({ error: "Failed to get node info.", details: error });
  }
});

//Endpoint for creating a hodl invoice

app.post("/api/create-invoice", async (req, res) => {
  const { amount, description } = req.body;

  const secret = crypto.randomBytes(32);
  const id = crypto.randomBytes(32);
  try {
    const invoice = await createHodlInvoice({
      lnd,
      tokens: amount,
      description,
      id,
      secret,
    });

    res.json({
      payment_request: invoice.request,
      id: id.toString("hex"), // lisible côté client
      secret: secret.toString("hex"), // idem
    });
  } catch (err) {
    console.error("Erreur création facture :", err);
    res.status(500).json({ error: "Erreur création facture" });
  }
});

app.post("/api/invoice", async (req, res) => {
  try {
    const { sats, description } = req.body;

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

/**
 * Valider une livraison (settle)
 */
app.post("/api/settle-invoice", async (req, res) => {
  const { secret } = req.body;

  try {
    await settleHodlInvoice({ lnd, secret });
    res.json({ message: "✅Facture validée (settled)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la validation" });
  }
});

/**
 * Annuler une facture (ex: litige)
 */
app.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;

  try {
    await cancelInvoice({ lnd, id });
    res.json({ message: " Facture annulée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur annulation" });
  }
});

/**
 * Voir statut d'une facture
 */
app.get("/invoice/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await getInvoice({ lnd, id });
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération" });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the BitKaba backend API!");
});

// --SERVER-STARTUP
connectToLnd();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("----------------------------------------------------");
  console.log("Available Endpoints:");
  console.log(`- GET    /api/getinfo`);
  console.log(`- GET    /api/balance`);
  console.log(`- GET    /api/invoices`);
  console.log(
    `- POST   /api/invoice  (Body: { "sats": 1000, "description": "Test" })`
  );
  console.log(
    `- POST   /api/create-invoice (Body: { "amount": 1000, "description": "Test" })`
  );
  console.log(`- POST   /api/settle-invoice (Body: { "secret": "xxxxxxxx" })`);
  console.log(`- POST   /api/pay      (Body: { "request": "lnbc..." })`);
  console.log("----------------------------------------------------");
});
