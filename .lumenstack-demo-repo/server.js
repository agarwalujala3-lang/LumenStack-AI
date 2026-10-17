const express = require("express");
const catalogRoutes = require("./src/routes/catalog");

const app = express();
app.use(express.json());
app.use("/api/catalog", catalogRoutes);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Catalog API listening on ${port}`));
