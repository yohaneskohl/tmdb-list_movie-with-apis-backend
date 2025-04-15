const express = require('express');
const router = express.Router();
const swaggerUI = require("swagger-ui-express");
const YAML = require("yaml");
const fs = require("fs");
const path = require("path");

const User = require("./user.routes");
const Render = require("./render.routes");

// Endpoint "/" untuk tes backend
router.get("/", (req, res) => {
  res.send("<h1>✅ Backend is running</h1>");
});

// Swagger docs
const swagger_path = path.resolve(__dirname, "../docs/api-docs.yaml");
const file = fs.readFileSync(swagger_path, "utf-8");
const swaggerDocument = YAML.parse(file);
router.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// API routes
router.use("/api/v1", User);
router.use("/api/v1", Render);

module.exports = router;
