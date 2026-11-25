const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { buyProduct, cancelOrder } = require("../controllers/order.controller");

const router = express.Router();
router.post("/", authenticate, buyProduct);
router.post("/:orderId/cancel", authenticate, cancelOrder);
module.exports = router;
