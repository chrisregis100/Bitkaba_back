// swaggerConfig.js
const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Test",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"], // Chemins des fichiers où sont tes docs en commentaire
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
