// ===== src/config.js =====
require("dotenv").config();

const config = {
  voltage: {
    host: process.env.VOLTAGE_HOST || "votre-noeud.voltage.cloud",
    port: parseInt(process.env.VOLTAGE_PORT) || 10009,
    certPath: "./certificates/tls.cert",
    macaroonPath: "./certificates/admin.macaroon",
  },
  lnbits: {
    url: process.env.LNBITS_URL || "https://votre-instance.lnbits.com",
    adminKey: process.env.LNBITS_ADMIN_KEY || "votre-admin-key",
  },
  app: {
    logLevel: process.env.LOG_LEVEL || "info",
    timeout: parseInt(process.env.TIMEOUT) || 60000,
  },
};

// Validation de la configuration
function validateConfig() {
  const required = ["VOLTAGE_HOST", "LNBITS_URL", "LNBITS_ADMIN_KEY"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}`
    );
  }

  console.log("✅ Configuration validée");
  return true;
}

module.exports = {
  config,
  validateConfig,
};

// ===== .env (fichier exemple) =====
/*
# Configuration Voltage
VOLTAGE_HOST=votre-noeud.voltage.cloud
VOLTAGE_PORT=10009

# Configuration LNbits
LNBITS_URL=https://votre-instance.lnbits.com
LNBITS_ADMIN_KEY=votre-admin-key-ici

# Configuration application
LOG_LEVEL=info
TIMEOUT=60000
*/

// ===== .gitignore =====
/*
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production

# Certificates et clés
certificates/
*.cert
*.macaroon

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temp files
tmp/
temp/
*/

// ===== package.json (version complète) =====
/*
{
  "name": "lightning-voltage-lnbits",
  "version": "1.0.0",
  "description": "Script pour connecter Voltage et LNbits avec transactions Lightning",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node tests/test.js",
    "validate": "node -e \"require('./src/config').validateConfig()\"",
    "setup": "node scripts/setup.js"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.0",
    "axios": "^1.5.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "keywords": [
    "lightning",
    "bitcoin",
    "lnd",
    "voltage",
    "lnbits",
    "grpc"
  ],
  "author": "Votre nom",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0"
  },
  "repository": {
    "type": "git",
    "url": "your-repo-url"
  }
}
*/
