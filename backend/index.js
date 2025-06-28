// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectToLnd, getLnd } = require("./lnd");
const lndRoutes = require("./routes/lndRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Middleware pour injecter lnd dans req
app.use((req, res, next) => {
  const lnd = getLnd();
  if (!lnd) {
    return res.status(503).json({ error: "LND not connected" });
  }
  req.lnd = lnd;
  next();
});

// Routes LND API
app.use("/api", lndRoutes);

// Swagger UI pour documentation API
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

connectToLnd();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
});
