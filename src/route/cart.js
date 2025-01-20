import express from "express";
import CartController from '../controllers/CartController.js';

const router = express.Router();
const Cart = (app) => {
    // Thêm sản phẩm vào giỏ hàng
    router.post('/add-to-cart', CartController.addToCart);
    // Bớt sản phẩm vào giỏ hàng
    router.post('/decrease', CartController.decreaseQuantity);
    // Lấy giỏ hàng của người dùng
    router.get('/cart/:idkhachhang', CartController.getCart);
    // Xóa sản phẩm khỏi giỏ hàng
    router.delete('/remove-from-cart/:idgiohang', CartController.removeFromCart);

    return app.use('/api', router);
}
export default Cart;
