const catalog = require("../data/catalog");

function searchCatalog(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return catalog;

  return catalog.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(normalizedQuery)
  );
}

module.exports = { searchCatalog };
