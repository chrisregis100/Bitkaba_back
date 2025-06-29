const express = require("express");
const router = express.Router();
const { getLnd } = require('../lnd');

// Middleware pour injecter lnd
router.use((req, res, next) => {
  req.lnd = getLnd();
  next();
});

const {
  getWalletInfo,
  getChainBalance,
  getChannelBalance,
  createInvoice,
  getInvoices,
  createHodlInvoice,
  subscribeToInvoice,
  settleHodlInvoice,
  pay,
  cancelInvoice,
  getInvoice,
} = require("ln-service");

/**
 * @swagger
 * tags:
 *   name: Lightning
 *   description: API pour interagir avec LND (Lightning Network Daemon)
 */

/**
 * @swagger
 * /api/getinfo:
 *   get:
 *     summary: Récupère des informations générales sur le noeud LND
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Informations du noeud LND
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Erreur serveur lors de la récupération des infos
 */
router.get("/getinfo", async (req, res) => {
  try {
    const info = await getWalletInfo({ lnd: req.lnd });
    res.json(info);
  } catch (error) {
    console.error("Error getting node info:", error);
    res.status(500).json({ error: "Failed to get node info.", details: error });
  }
});

/**
 * @swagger
 * /api/balance:
 *   get:
 *     summary: Récupère les soldes on-chain et off-chain (channels)
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Soldes récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onChainBalance:
 *                   type: object
 *                   description: Solde on-chain (Bitcoin)
 *                 offChainBalance:
 *                   type: object
 *                   description: Solde off-chain (canaux Lightning)
 *       500:
 *         description: Erreur serveur lors de la récupération des soldes
 */
router.get("/balance", async (req, res) => {
  try {
    const onChainBalance = await getChainBalance({ lnd: req.lnd });
    const offChainBalance = await getChannelBalance({ lnd: req.lnd });
    res.json({ onChainBalance, offChainBalance });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ error: "Failed to get balance.", details: error });
  }
});

/**
 * @swagger
 * /api/invoice:
 *   post:
 *     summary: Crée une nouvelle invoice Lightning
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sats
 *             properties:
 *               sats:
 *                 type: number
 *                 description: Montant en satoshis
 *                 example: 1000
 *               description:
 *                 type: string
 *                 description: Description optionnelle de la facture
 *                 example: "Paiement test"
 *     responses:
 *       200:
 *         description: Invoice créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Identifiant de l'invoice
 *                 request:
 *                   type: string
 *                   description: Chaîne BOLT11 de paiement
 *       400:
 *         description: Mauvais format ou montant invalide
 *       500:
 *         description: Erreur serveur lors de la création de l'invoice
 */
router.post("/invoice", async (req, res) => {
  try {
    const { sats, description } = req.body;
    if (sats === undefined || typeof sats !== "number" || sats <= 0) {
      return res.status(400).json({ error: "A positive numeric `sats` value is required." });
    }

    const invoice = await createInvoice({
      lnd: req.lnd,
      tokens: sats,
      description: description || "",
    });
    res.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Récupère la liste de toutes les invoices
 *     tags: [Lightning]
 *     responses:
 *       200:
 *         description: Liste des invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur lors de la récupération des invoices
 */
router.get("/invoices", async (req, res) => {
  try {
    const { invoices } = await getInvoices({ lnd: req.lnd });
    res.json(invoices);
  } catch (error) {
    console.error("Error listing invoices:", error);
    res.status(500).json({ error: "Failed to list invoices.", details: error });
  }
});

/**
 * @swagger
 * /api/pay:
 *   post:
 *     summary: Payer une invoice Lightning
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request
 *             properties:
 *               request:
 *                 type: string
 *                 description: Chaîne BOLT11 de paiement (invoice)
 *                 example: "lnbc1..."
 *     responses:
 *       200:
 *         description: Paiement effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment_info:
 *                   type: object
 *       400:
 *         description: Requête invalide (request manquant)
 *       500:
 *         description: Erreur serveur lors du paiement
 */
router.post("/pay", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res.status(400).json({ error: "A `request` string (BOLT11 invoice) is required." });
    }
    const paymentResult = await pay({ lnd: req.lnd, request });
    res.json({ success: true, payment_info: paymentResult });
  } catch (error) {
    console.error("Error paying invoice:", error);
    res.status(500).json({ error: "Failed to pay invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/holdinvoice:
 *   post:
 *     summary: Créer une hold invoice (requiert un règlement manuel)
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Montant en satoshis
 *                 example: 1000
 *               description:
 *                 type: string
 *                 description: Description optionnelle
 *                 example: "Hold invoice example"
 *               timestamp:
 *                 type: integer
 *                 description: Timestamp expiration (en ms ou en date ISO)
 *                 example: 1679043200000
 *     responses:
 *       200:
 *         description: Hold invoice créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoice:
 *                   type: object
 *       400:
 *         description: Montant invalide ou requête mal formée
 *       500:
 *         description: Erreur serveur lors de la création de la hold invoice
 */
router.post("/holdinvoice", async (req, res) => {
  try {
    const { amount, description, timestamp } = req.body;
    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "A positive numeric `amount` value is required." });
    }

    const invoice = await createHodlInvoice({
      lnd: req.lnd,
      tokens: amount,
      description: description || "",
      expires_at: timestamp ? new Date(timestamp).toISOString() : new Date(Date.now() + 3600000).toISOString(),
    });

    res.json({ invoice });
  } catch (error) {
    console.error("Error creating hold invoice:", error);
    res.status(500).json({ error: "Failed to create hold invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/settleholdinvoice:
 *   post:
 *     summary: Règler une hold invoice manuellement
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - secret
 *             properties:
 *               id:
 *                 type: string
 *                 description: Identifiant de la hold invoice
 *               secret:
 *                 type: string
 *                 description: Secret de règlement de la hold invoice
 *     responses:
 *       200:
 *         description: Hold invoice réglée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settled:
 *                   type: object
 *       400:
 *         description: Paramètres manquants ou invoice non détenue
 *       500:
 *         description: Erreur serveur lors du règlement
 */
router.post("/settleholdinvoice", async (req, res) => {
  try {
    const { id, secret } = req.body;
    if (!id || !secret) {
      return res.status(400).json({ error: "Both `id` and `secret` are required." });
    }

    const sub = subscribeToInvoice({ lnd: req.lnd, id });

    sub.on("invoice_updated", async (invoice) => {
      if (!invoice.is_held) {
        return res.status(400).json({ error: "Invoice is not held." });
      }

      if (invoice.is_confirmed) {
        sub.removeAllListeners();
      }

      const settled = await settleHodlInvoice({ lnd: req.lnd, secret });
      res.json({ success: true, settled });
    });
  } catch (error) {
    console.error("Error settling hold invoice:", error);
    res.status(500).json({ error: "Failed to settle hold invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/cancel-invoice:
 *   post:
 *     summary: Annuler une invoice existante
 *     tags: [Lightning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: Identifiant de l'invoice à annuler
 *     responses:
 *       200:
 *         description: Invoice annulée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invoice cancelled
 *       500:
 *         description: Erreur serveur lors de l'annulation
 */
router.post("/cancel-invoice", async (req, res) => {
  const { id } = req.body;
  try {
    await cancelInvoice({ lnd: req.lnd, id });
    res.json({ message: "Invoice cancelled" });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res.status(500).json({ error: "Failed to cancel invoice.", details: error });
  }
});

/**
 * @swagger
 * /api/invoice/{id}:
 *   get:
 *     summary: Récupérer une invoice par son identifiant
 *     tags: [Lightning]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Identifiant de l'invoice à récupérer
 *     responses:
 *       200:
 *         description: Invoice récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Erreur serveur lors de la récupération de l'invoice
 */
router.get("/invoice/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await getInvoice({ lnd: req.lnd, id });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice.", details: error });
  }
});

module.exports = router;
