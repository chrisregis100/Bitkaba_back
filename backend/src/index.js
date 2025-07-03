// ===== src/index.js =====
const grpc = require("@grpc/grpc-js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { config, validateConfig } = require("./config");

// Valider la configuration au démarrage
validateConfig();

// Charger les proto files LND
const protoLoader = require("@grpc/proto-loader");
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "../proto/rpc.proto"),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc;

class LightningManager {
  constructor() {
    this.lndClient = null;
    this.wallets = [];
  }

  // Initialiser la connexion LND via Voltage
  async initializeLND() {
    try {
      // Lire les certificats
      const tlsCert = fs.readFileSync(
        path.join(__dirname, "../", config.voltage.certPath)
      );
      const macaroon = fs.readFileSync(
        path.join(__dirname, "../", config.voltage.macaroonPath)
      );

      // Créer les credentials
      const sslCreds = grpc.credentials.createSsl(tlsCert);
      const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
        (args, callback) => {
          const metadata = new grpc.Metadata();
          metadata.add("macaroon", macaroon.toString("hex"));
          callback(null, metadata);
        }
      );

      const credentials = grpc.credentials.combineChannelCredentials(
        sslCreds,
        macaroonCreds
      );

      // Créer le client gRPC
      this.lndClient = new lnrpc.Lightning(
        `${config.voltage.host}:${config.voltage.port}`,
        credentials
      );

      // Tester la connexion
      await this.getNodeInfo();
      console.log("✅ Connexion LND établie avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la connexion LND:", error);
      throw error;
    }
  }

  // Obtenir les informations du nœud
  async getNodeInfo() {
    return new Promise((resolve, reject) => {
      this.lndClient.getInfo({}, (error, response) => {
        if (error) {
          reject(error);
        } else {
          console.log("Node Info:", {
            alias: response.alias,
            pubkey: response.identity_pubkey,
            version: response.version,
            block_height: response.block_height,
          });
          resolve(response);
        }
      });
    });
  }

  // Créer un wallet sur LNbits
  async createLNbitsWallet(name) {
    try {
      const response = await axios.post(
        `${config.lnbits.url}/api/v1/wallet`,
        {
          name: name,
          user_id: `user_${Date.now()}`,
        },
        {
          headers: {
            "X-Api-Key": config.lnbits.adminKey,
            "Content-Type": "application/json",
          },
        }
      );

      const wallet = {
        name: name,
        id: response.data.id,
        adminkey: response.data.adminkey,
        inkey: response.data.inkey,
        balance: 0,
      };

      this.wallets.push(wallet);
      console.log(`✅ Wallet "${name}" créé:`, wallet.id);
      return wallet;
    } catch (error) {
      console.error(
        `❌ Erreur création wallet "${name}":`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Obtenir le solde d'un wallet LNbits
  async getWalletBalance(wallet) {
    try {
      const response = await axios.get(`${config.lnbits.url}/api/v1/wallet`, {
        headers: {
          "X-Api-Key": wallet.inkey,
        },
      });

      wallet.balance = response.data.balance;
      console.log(`💰 Solde wallet "${wallet.name}": ${wallet.balance} sats`);
      return wallet.balance;
    } catch (error) {
      console.error(
        `❌ Erreur récupération solde "${wallet.name}":`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Créer une facture Lightning
  async createInvoice(wallet, amount, memo) {
    try {
      const response = await axios.post(
        `${config.lnbits.url}/api/v1/payments`,
        {
          out: false,
          amount: amount,
          memo: memo || `Facture ${wallet.name}`,
          unit: "sat",
        },
        {
          headers: {
            "X-Api-Key": wallet.inkey,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`📄 Facture créée pour "${wallet.name}": ${amount} sats`);
      return response.data.payment_request;
    } catch (error) {
      console.error(
        `❌ Erreur création facture "${wallet.name}":`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Payer une facture Lightning via LND
  async payInvoice(paymentRequest) {
    return new Promise((resolve, reject) => {
      const request = {
        payment_request: paymentRequest,
        timeout_seconds: 60,
        fee_limit_sat: 10,
      };

      this.lndClient.sendPaymentSync(request, (error, response) => {
        if (error) {
          console.error("❌ Erreur paiement:", error);
          reject(error);
        } else if (response.payment_error) {
          console.error("❌ Erreur paiement:", response.payment_error);
          reject(new Error(response.payment_error));
        } else {
          console.log("✅ Paiement réussi:", {
            preimage: response.payment_preimage,
            route: response.payment_route,
          });
          resolve(response);
        }
      });
    });
  }

  // Effectuer une transaction entre wallets
  async transferBetweenWallets(fromWallet, toWallet, amount, memo) {
    try {
      console.log(
        `\n🔄 Transfert: ${fromWallet.name} → ${toWallet.name} (${amount} sats)`
      );

      // Vérifier le solde du wallet source
      await this.getWalletBalance(fromWallet);
      if (fromWallet.balance < amount) {
        throw new Error(`Solde insuffisant dans ${fromWallet.name}`);
      }

      // Créer une facture sur le wallet destination
      const invoice = await this.createInvoice(toWallet, amount, memo);

      // Payer la facture via LND
      const payment = await this.payInvoice(invoice);

      // Vérifier les nouveaux soldes
      await this.getWalletBalance(fromWallet);
      await this.getWalletBalance(toWallet);

      console.log("✅ Transfert terminé avec succès");
      return payment;
    } catch (error) {
      console.error("❌ Erreur lors du transfert:", error.message);
      throw error;
    }
  }

  // Financer un wallet depuis LND
  async fundWallet(wallet, amount) {
    try {
      console.log(
        `\n💸 Financement du wallet "${wallet.name}" avec ${amount} sats`
      );

      // Créer une facture
      const invoice = await this.createInvoice(
        wallet,
        amount,
        `Financement ${wallet.name}`
      );

      // Payer via LND
      await this.payInvoice(invoice);

      // Vérifier le nouveau solde
      await this.getWalletBalance(wallet);

      console.log(`✅ Wallet "${wallet.name}" financé`);
    } catch (error) {
      console.error(
        `❌ Erreur financement wallet "${wallet.name}":`,
        error.message
      );
      throw error;
    }
  }
}

// Fonction principale
async function main() {
  const manager = new LightningManager();

  try {
    console.log("🚀 Démarrage du script Lightning Network...\n");

    // 1. Initialiser LND
    await manager.initializeLND();

    // 2. Créer deux wallets sur LNbits
    const wallet1 = await manager.createLNbitsWallet("Wallet-A");
    const wallet2 = await manager.createLNbitsWallet("Wallet-B");

    // 3. Vérifier les soldes initiaux
    await manager.getWalletBalance(wallet1);
    await manager.getWalletBalance(wallet2);

    // 4. Financer le premier wallet (optionnel)
    // await manager.fundWallet(wallet1, 1000);

    // 5. Effectuer un transfert entre wallets
    // await manager.transferBetweenWallets(wallet1, wallet2, 500, 'Test transfert');

    console.log("\n✅ Script terminé avec succès");
  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LightningManager;
