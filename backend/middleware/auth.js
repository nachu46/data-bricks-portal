function requireAdmin(req, res, next) {
  const role = req.headers.role;

  if (role !== "admin") {
    return res.status(403).send({ message: "Access denied. Admin only." });
  }

  next();
}

function requireCustomer(req, res, next) {
  const role = req.headers.role;

  if (role !== "customer") {
    return res.status(403).send({ message: "Access denied. Customer only." });
  }

  next();
}

module.exports = { requireAdmin, requireCustomer };
