import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu
import jwt from 'jsonwebtoken';
const CartController = {
    // Thêm sản phẩm vào giỏ hàng
    async addToCart(req, res) {
        try {
            // Lấy token từ header Authorization
            
            const idkhachhang = req.user.id;
    
            //  Lấy `idsanpham` từ request body
            const { idsanpham } = req.body;
    
            if (!idsanpham) {
                return res.status(400).json({ message: 'Product ID is required' });
            }
    
            //  Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            const [existingProduct] = await connection.query(
                'SELECT * FROM giohang WHERE idkhachhang = ? AND idsanpham = ?',
                [idkhachhang, idsanpham]
            );
    
            if (existingProduct.length > 0) {
                // Nếu sản phẩm đã có, cộng thêm 1 vào số lượng
                const newQuantity = existingProduct[0].sl + 1;
                await connection.query(
                    'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idsanpham = ?',
                    [newQuantity, idkhachhang, idsanpham]
                );
                return res.status(200).json({ message: 'Product quantity updated in cart' });
            } else {
                // Nếu sản phẩm chưa có, thêm mới vào giỏ hàng với số lượng = 1
                await connection.query(
                    'INSERT INTO giohang (idkhachhang, idsanpham, sl) VALUES (?, ?, ?)',
                    [idkhachhang, idsanpham, 1]  // Đặt số lượng mặc định là 1
                );
                return res.status(201).json({ message: 'Product added to cart' });
            }
        } catch (error) {
            console.error('Error in addToCart:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },    
    // Lấy giỏ hàng của người dùng
    async getCart(req, res) {
        try {
            const id = req.user.id;
            // Lấy các sản phẩm trong giỏ hàng của người dùng
            const [cartItems] = await connection.query(
                `SELECT c.idgiohanghang, c.idsanpham, c.sl, p.tensp, p.mausac, p.xuatxu, 
                p.hinhanh , 
                p.diemtb, p.gia, p.tonkho, p.mota
                FROM giohang c
                INNER JOIN sanpham p ON c.idsanpham = p.idSanPham
                WHERE c.idkhachhang = ?`,
                [id]
            );
            
            if (cartItems.length === 0) {
                return res.status(404).json({ message: 'Your cart is empty' });
            }
            
            return res.status(200).json({ cart: cartItems });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },


    // Xóa sản phẩm khỏi giỏ hàng
    async removeFromCart(req, res) {
        const { idgiohanghang } = req.params;    
        try {
            await connection.query(
                'DELETE FROM giohang WHERE idgiohanghang = ?',
                [idgiohanghang]
            );
            return res.status(200).json({ message: 'Product removed from cart' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    async changeQuantity(req, res) {
        const { idsanpham, status } = req.body;
    
        try {
           
            const idkhachhang = req.user.id;
            // Kiểm tra xem sản phẩm có trong giỏ hàng không
            const [existingProduct] = await connection.query(
                'SELECT * FROM giohang WHERE idkhachhang = ? AND idsanpham = ?',
                [idkhachhang, idsanpham]
            );
    
            if (existingProduct.length === 0) {
                return res.status(404).json({ message: 'Product not found in cart' });
            }
    
            let newQuantity;
    
            if (status === 'decrease') {
                // Giảm số lượng đi 1
                newQuantity = existingProduct[0].sl - 1;
    
                if (newQuantity <= 0) {
                    // Nếu số lượng còn lại <= 0, xóa sản phẩm khỏi giỏ hàng
                    await connection.query(
                        'DELETE FROM giohang WHERE idkhachhang = ? AND idsanpham = ?',
                        [idkhachhang, idsanpham]
                    );
                    return res.status(200).json({ message: 'Product removed from cart' });
                } else {
                    // Nếu số lượng > 0, chỉ cập nhật số lượng
                    await connection.query(
                        'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idsanpham = ?',
                        [newQuantity, idkhachhang, idsanpham]
                    );
                    return res.status(200).json({ message: 'Product quantity decreased' });
                }
            }
    
            if (status === 'increase') {
                // Tăng số lượng lên 1
                newQuantity = existingProduct[0].sl + 1;
    
                await connection.query(
                    'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idsanpham = ?',
                    [newQuantity, idkhachhang, idsanpham]
                );
                return res.status(200).json({ message: 'Product quantity increased' });
            }
    
            // Nếu status không phải 'increase' hoặc 'decrease'
            return res.status(400).json({ message: 'Invalid status, must be "increase" or "decrease"' });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },    
};

export default CartController;
