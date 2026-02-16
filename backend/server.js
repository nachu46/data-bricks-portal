require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Import routes
const accessRoutes = require("./routes/access");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

// Register API routes
app.use("/api/access", accessRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
