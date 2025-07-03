const axios = require("axios");

class LNbitsService {
  constructor() {
    // Vérifier que les variables d'environnement sont définies
    if (!process.env.LNBITS_NODE_URL) {
      throw new Error("LNBITS_NODE_URL environment variable is required");
    }
    if (!process.env.LNBITS_ADMIN_KEY) {
      throw new Error("LNBITS_ADMIN_KEY environment variable is required");
    }
    if (!process.env.LNBITS_INVOICE_KEY) {
      throw new Error("LNBITS_INVOICE_KEY environment variable is required");
    }

    // Nettoyer l'URL (enlever le slash à la fin si présent)
    this.baseURL = process.env.LNBITS_NODE_URL.replace(/\/$/, "");
    this.adminKey = process.env.LNBITS_ADMIN_KEY;
    this.invoiceKey = process.env.LNBITS_INVOICE_KEY;

    // Create axios instance with default config
    this.api = axios.create({
      baseURL: this.baseURL, // Utiliser la variable d'environnement
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Ajouter un intercepteur pour logger les requêtes (debug)
    this.api.interceptors.request.use(
      (config) => {
        console.log(`Making request to: ${config.baseURL}${config.url}`);
        console.log(`Headers:`, config.headers);
        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Ajouter un intercepteur pour logger les réponses (debug)
    this.api.interceptors.response.use(
      (response) => {
        console.log(`Response status: ${response.status}`);
        return response;
      },
      (error) => {
        console.error(
          "Response interceptor error:",
          error.response?.status,
          error.message
        );
        return Promise.reject(error);
      }
    );
  }

  // Create Lightning invoice
  async getWalletBalance() {
    try {
      const response = await this.api.get("/api/v1/wallet", {
        headers: { "X-Api-Key": this.invoiceKey },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to get wallet balance");
    }
  }

  // Create Lightning invoice
  async createInvoice(amount, memo = "", expiry = 3600) {
    try {
      const payload = {
        out: false,
        amount: parseInt(amount),
        memo: memo,
        expiry: expiry,
      };

      const response = await this.api.post("/api/v1/payments", payload, {
        headers: { "X-Api-Key": this.invoiceKey },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to create invoice");
    }
  }

  // Check payment status
  async checkPayment(paymentHash) {
    try {
      const response = await this.api.get(`/api/v1/payments/${paymentHash}`, {
        headers: { "X-Api-Key": this.invoiceKey },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to check payment status");
    }
  }

  // Pay Lightning invoice
  async payInvoice(bolt11) {
    try {
      const payload = {
        out: true,
        bolt11: bolt11,
      };

      const response = await this.api.post("/api/v1/payments", payload, {
        headers: { "X-Api-Key": this.adminKey },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to pay invoice");
    }
  }

  // Get payment history
  async getPaymentHistory(limit = 50) {
    try {
      const response = await this.api.get(`/api/v1/payments?limit=${limit}`, {
        headers: { "X-Api-Key": this.invoiceKey },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to get payment history");
    }
  }

  // Decode Lightning invoice
  async decodeInvoice(bolt11) {
    try {
      const response = await this.api.post(
        "/api/v1/payments/decode",
        { data: bolt11 },
        { headers: { "X-Api-Key": this.invoiceKey } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to decode invoice");
    }
  }

  // Create a new wallet
  async createWallet(walletName, adminId = null) {
    try {
      const payload = {
        name: walletName,
        adminkey: adminId,
      };

      const response = await this.api.post("/api/v1/wallet", payload, {
        headers: { "X-Api-Key": this.adminKey },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to create wallet");
    }
  }

  async getWalletInfo() {
    try {
      const response = await this.api.get("/api/v1/wallet", {
        headers: { "X-Api-Key": this.adminKey },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to get wallet info");
    }
  }

  // Handle errors consistently
  handleError(error, message) {
    console.error(
      `LNbits Service Error: ${message}`,
      error.response?.data || error.message
    );

    if (error.response) {
      return new Error(
        `${message}: ${
          error.response.data?.detail || error.response.statusText
        }`
      );
    }
    return new Error(`${message}: ${error.message}`);
  }
}

module.exports = new LNbitsService();
