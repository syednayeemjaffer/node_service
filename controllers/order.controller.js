const Product = require("../models/product.model");
const Order = require("../models/order.model");

const buyProduct = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (typeof productId !== "string" || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: "Provide a productId and a positive whole-number quantity" });
    }
    const product = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true },
    );
    if (!product) return res.status(409).json({ success: false, message: "Product does not exist or has insufficient stock" });
    try {
      const order = await Order.create({ user: req.user.id, product: product.id, quantity, unitPrice: product.price, totalPrice: product.price * quantity });
      return res.status(201).json({ success: true, order });
    } catch (error) {
      await Product.findByIdAndUpdate(product.id, { $inc: { stock: quantity } });
      throw error;
    }
  } catch (error) { next(error); }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, user: req.user.id, status: "placed" },
      { status: "cancelled", cancelledAt: new Date() },
      { new: true },
    );
    if (!order) return res.status(404).json({ success: false, message: "Active order not found" });
    await Product.findByIdAndUpdate(order.product, { $inc: { stock: order.quantity } });
    res.status(200).json({ success: true, order });
  } catch (error) { next(error); }
};

module.exports = { buyProduct, cancelOrder };
