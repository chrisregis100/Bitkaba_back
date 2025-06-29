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
    // Récupère l'adresse du noeud LND depuis les variables d'environnement
    const socket = process.env.LND_GRPC_HOST;
    // Récupère le macaroon (authentification) depuis les variables d'environnement
    const macaroon = process.env.LND_MACAROON_BASE64;
    // Récupère le certificat TLS depuis les variables d'environnement
    const cert = process.env.LND_TLS_CERT_BASE64;

    // Vérifie que toutes les informations nécessaires sont présentes
    if (!socket || !macaroon || !cert) {
      // Affiche une erreur si une information manque
      console.error("LND connection details are missing in .env");
      // Affiche un message d'aide
      console.error(
        "Please provide LND_GRPC_HOST, LND_MACAROON_BASE64, and LND_TLS_CERT_BASE64."
      );
      // Arrête le processus avec une erreur
      process.exit(1);
    }

    // Crée une instance authentifiée de LND avec les informations fournies
    const { lnd: authenticatedLnd } = authenticatedLndGrpc({
      socket,
      macaroon,
      cert,
    });

    // Stocke l'instance LND authentifiée dans la variable globale
    lnd = authenticatedLnd;
    // Affiche un message de succès
    console.log("Successfully connected to LND node.");
  } catch (error) {
    // Affiche une erreur si la connexion échoue
    console.error("Failed to connect to LND:", error);
    // Arrête le processus avec une erreur
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
