const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require("../controllers/product.controller");

const router = express.Router();
router.get("/", authenticate, getProducts);
router.get("/:productId", authenticate, getProduct);
router.post("/", authenticate, authorize("admin"), createProduct);
router.patch("/:productId", authenticate, authorize("admin"), updateProduct);
router.delete("/:productId", authenticate, authorize("admin"), deleteProduct);
module.exports = router;
