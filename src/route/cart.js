import express from "express";
import CartController from '../controllers/CartController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Cart = (app) => {
    // Thêm sản phẩm vào giỏ hàng
    router.post('/add-to-cart',authenticateJWT, CartController.addToCart);
    // Bớt sản phẩm vào giỏ hàng
    router.post('/decrease',authenticateJWT, CartController.changeQuantity);
    // Lấy giỏ hàng của người dùng
    router.get('/cart',authenticateJWT, CartController.getCart);
    // Xóa sản phẩm khỏi giỏ hàng
    router.delete('/remove-from-cart/:idgiohang',authenticateJWT, CartController.removeFromCart);
        
    return app.use('/api', router);
}
export default Cart;
