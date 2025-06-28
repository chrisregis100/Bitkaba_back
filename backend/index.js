const express = require('express');
const cors = require('cors');
const chalk = require('chalk').default;
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API LND Bitkaba',
    version: '1.0.0',
    description: 'Documentation des endpoints LND (Lightning Network Daemon)'
  },
  servers: [
    { url: 'http://localhost:3000/api' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const lndRoutes = require('./routes/lndRoutes');
app.use('/api', lndRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(chalk.green.bold(`\nServeur BitKaba LND lancé sur le port ${PORT}`));
  console.log(chalk.cyan('----------------------------------------------------'));
  console.log(chalk.yellow('Endpoints disponibles :'));
  console.log(chalk.blue('- GET    /api/getinfo'));
  console.log(chalk.blue('- GET    /api/balance'));
  console.log(chalk.blue('- GET    /api/invoices'));
  console.log(chalk.blue('- POST   /api/invoice        (Body: { "sats": 1000, "description": "Test" })'));
  console.log(chalk.blue('- POST   /api/holdinvoice    (Body: { "amount": 1000, "description": "Test", "timestamp": 1679043200 })'));
  console.log(chalk.blue('- POST   /api/settleholdinvoice (Body: { "id": "xxxxxxxx", "secret": "xxxxxxxx" })'));
  console.log(chalk.blue('- POST   /api/pay            (Body: { "request": "lnbc..." })'));
  console.log(chalk.cyan('----------------------------------------------------\n'));
  console.log(chalk.magenta('Documentation Swagger : http://localhost:3000/docs\n'));
});