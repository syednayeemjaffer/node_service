const Product = require("../models/product.model");

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (error) { next(error); }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description = "", price, stock } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 150 ||
      typeof description !== "string" || description.length > 2000 ||
      !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: "Provide valid name, description, non-negative price, and whole-number stock" });
    }
    const product = await Product.create({ name: name.trim(), description: description.trim(), price, stock });
    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    const updates = {};
    const { name, description, price, stock } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 150) return res.status(400).json({ success: false, message: "Invalid name" });
      updates.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string" || description.length > 2000) return res.status(400).json({ success: false, message: "Invalid description" });
      updates.description = description.trim();
    }
    if (price !== undefined) {
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ success: false, message: "Invalid price" });
      updates.price = price;
    }
    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ success: false, message: "Invalid stock" });
      updates.stock = stock;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No product fields supplied" });
    const product = await Product.findByIdAndUpdate(req.params.productId, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  } catch (error) { next(error); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) { next(error); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
