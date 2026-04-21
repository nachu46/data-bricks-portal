const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret-key-change-this-in-prod";

/**
 * Middleware to verify JWT and ensure the user is an Admin.
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
    }

    req.user = decoded; // Store decoded user for route use
    next();
  } catch (err) {
    console.error("❌ JWT Verify Error:", err.message);
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired token" });
  }
}

module.exports = { requireAdmin };
