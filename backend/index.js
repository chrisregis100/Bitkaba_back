const { connectToLnd } = require("./service/lnd");
connectToLnd();

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const LNbitsService = require("./service/lnbits.service");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
app.use(helmet());
app.use(cors());

const lightningRoutes = require("./routes/lightning.route");
const { errorHandler } = require("./middleware/errorHandle.middleware");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/api/lightning", lightningRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "LNbits Lightning API",
  });
});

// Error handling middleware
app.use(errorHandler);

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API LND Bitkaba",
    version: "1.0.0",
    description: "Documentation des endpoints LND (Lightning Network Daemon)",
  },
  servers: [{ url: "http://localhost:3000/api" }],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const lndRoutes = require("./routes/lndRoutes");
app.use("/api", lndRoutes);

app.get("/", (req, res) => {
  res.send(`
    <h1>Bienvenue sur l'API LNbits Lightning</h1>
    <p>Cette API permet d'interagir avec le réseau Lightning Network via LNbits.</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServeur BitKaba LND lancé sur le port ${PORT}`);
  console.log(`🚀 Lightning API server running on port ${PORT}`);
  console.log(
    `⚡ The Lnbits Bitcoin Hackathon is running on : http://localhost:${PORT}`
  );
  console.log(`📡 LNbits URL: ${process.env.LNBITS_NODE_URL}`);
  console.log("----------------------------------------------------");
  console.log("Endpoints disponibles :");
  console.log("- GET    /api/getinfo");
  console.log("- GET    /api/balance");
  console.log("- GET    /api/invoices");
  console.log(
    '- POST   /api/invoice        (Body: { "sats": 1000, "description": "Test" })'
  );

  console.log;

  ('- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })');

  console.log(
    '- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })'
  );

  console.log(
    '- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'
  );

  console.log('- POST   /api/pay            (Body: { "request": "lnbc..." })');
  console.log("----------------------------------------------------\n");
  console.log(
    `API Server using 'ln-service' package is running on http://localhost:${PORT}`
  );
  console.log("----------------------------------------------------");
  console.log("Available Endpoints:");
  console.log(`- GET    /api/getinfo`);
  console.log(`- GET    /api/balance`);
  console.log(`- GET    /api/invoices`);
  console.log(
    `- POST   /api/invoice  (Body: { "sats": 1000, "description": "Test" })`
  );
  console.log(`- POST   /api/pay      (Body: { "request": "lnbc..." })`);
  console.log("----------------------------------------------------");
  console.log("Documentation Swagger : http://localhost:3000/docs\n");
});
