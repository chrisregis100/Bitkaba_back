// lnd.js
const { authenticatedLndGrpc } = require("ln-service");
const dotenv = require("dotenv");

dotenv.config();

let lnd = null;

function connectToLnd() {
  try {
    const socket = process.env.LND_GRPC_HOST;
    const macaroon = process.env.LND_MACAROON_BASE64;
    const cert = process.env.LND_TLS_CERT_BASE64;

    if (!socket || !macaroon || !cert) {
      console.error("LND connection details are missing in .env");
      console.error(
        "Please provide LND_GRPC_HOST, LND_MACAROON_BASE64, and LND_TLS_CERT_BASE64."
      );
      process.exit(1);
    }

    const { lnd: authenticatedLnd } = authenticatedLndGrpc({
      socket,
      macaroon,
      cert,
    });

    lnd = authenticatedLnd;
    console.log("Successfully connected to LND node.");
  } catch (error) {
    console.error("Failed to connect to LND:", error.message);
    process.exit(1);
  }
}

function getLnd() {
  return lnd;
}

module.exports = {
  connectToLnd,
  getLnd,
};
