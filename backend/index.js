const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swaggerConfig");
const { authenticatedLndGrpc } = require("ln-service");
const crypto = require("crypto");
const {
  createHoldInvoice,
  settleInvoice,
  cancelInvoice,
  getInvoice,
} = require("ln-service");

const app = express();

dotenv.config();

//middleware config
app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const port = process.env.PORT || 3000;

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

module.exports = checkLndConnection;

app.use(checkLndConnection);

// --- 4. API ENDPOINTS / ROUTES ---
app.post("/create-invoice", async (req, res) => {
  const { amount, description } = req.body;

  const secret = crypto.randomBytes(32);
  const secretHex = secret.toString("hex");

  try {
    const invoice = await createHoldInvoice({
      lnd,
      tokens: amount,
      description,
      id: crypto.randomUUID(), // identifiant unique
      secret,
    });

    res.json({
      payment_request: invoice.request,
      id: invoice.id,
      secret: secretHex, // utile pour tester
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création facture" });
  }
});

/**
 * Valider une livraison (settle)
 */
app.post("/settle-invoice", async (req, res) => {
  const { secret } = req.body;

  try {
    await settleInvoice({ lnd, secret });
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

// --SERVER-STARTUP
connectToLnd();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
