// lnd.js
// Importe la fonction authenticatedLndGrpc du module ln-service
const { authenticatedLndGrpc } = require("ln-service");
// Importe le module dotenv pour gérer les variables d'environnement
const dotenv = require("dotenv");

// Charge les variables d'environnement à partir du fichier .env
dotenv.config();

// Initialise la variable lnd à null (elle contiendra l'instance LND authentifiée)
let lnd = null;

// Fonction pour se connecter au noeud LND
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
    if (lnd) {
      console.log("Successfully authenticated with LND node via ln-service!");
    }
  } catch (error) {
    console.error("Failed to connect to LND:", error.message);
    process.exit(1);
  }
}

// Fonction pour récupérer l'instance LND authentifiée
function getLnd() {
  return lnd;
}

// Exporte les fonctions connectToLnd et getLnd pour les utiliser ailleurs dans le projet
module.exports = {
  connectToLnd,
  getLnd,
};
