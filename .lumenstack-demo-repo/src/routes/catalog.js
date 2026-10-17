const express = require("express");
const { searchCatalog } = require("../services/catalogService");

const router = express.Router();

router.get("/", (request, response) => {
  const query = String(request.query.q || "");
  response.json({ items: searchCatalog(query) });
});

module.exports = router;
