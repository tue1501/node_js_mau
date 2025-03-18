import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu
import jwt from 'jsonwebtoken';
const CartController = {
    // Thêm sản phẩm vào giỏ hàng
    async addToCart(req, res) {
        try {
            // Lấy ID khách hàng từ token
            const idkhachhang = req.user.id;
    
            // Lấy idmau và số lượng từ request body
            let { idmau, sl } = req.body;
    
            if (!idmau) {
                return res.status(400).json({ message: 'Product Color ID is required' });
            }
    
            // Ép kiểu idmau thành số nguyên
            idmau = parseInt(idmau);
            if (isNaN(idmau)) {
                return res.status(400).json({ message: 'Invalid Product Color ID' });
            }
    
            // Kiểm tra xem idMau có tồn tại trong bảng sanpham_mau_hinhanh hay không
            const [colorExists] = await connection.query(
                'SELECT id FROM sanpham_mau_hinhanh WHERE id = ?',
                [idmau]
            );
    
            if (colorExists.length === 0) {
                return res.status(404).json({ message: 'Product color not found' });
            }
    
            // Kiểm tra số lượng hợp lệ, nếu không có thì mặc định là 1
            const quantityToAdd = parseInt(sl) > 0 ? parseInt(sl) : 1;
    
            // Kiểm tra xem sản phẩm (màu sắc) đã có trong giỏ hàng chưa
            const [existingProduct] = await connection.query(
                'SELECT * FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                [idkhachhang, idmau]
            );
    
            if (existingProduct.length > 0) {
                // Nếu sản phẩm đã có, cập nhật số lượng
                const newQuantity = existingProduct[0].sl + quantityToAdd;
                await connection.query(
                    'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                    [newQuantity, idkhachhang, idmau]
                );
                return res.status(200).json({ message: 'Product quantity updated in cart' });
            } else {
                // Nếu sản phẩm chưa có, thêm mới vào giỏ hàng
                await connection.query(
                    'INSERT INTO giohang (idkhachhang, idMau, sl) VALUES (?, ?, ?)',
                    [idkhachhang, idmau, quantityToAdd]
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
            // Lấy các sản phẩm trong giỏ hàng của người dùng theo idMau
            const [cartItems] = await connection.query(
                `SELECT c.idgiohang , c.idMau, c.sl, 
                        sp.tensp, sp.xuatxu, sp.diemtb, sp.gia, sp.tonkho, sp.mota, 
                        m.tenmau, 
                        CASE 
                            WHEN m.hinhanh IS NOT NULL THEN m.hinhanh 
                            ELSE sp.hinhanh 
                        END AS hinhanh 
                 FROM giohang c
                 INNER JOIN sanpham_mau_hinhanh m ON c.idMau = m.id
                 INNER JOIN sanpham sp ON m.idSanPham = sp.idSanPham
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
        const { idgiohang } = req.params; // Sửa lại đúng tên biến
        try {
            // Kiểm tra xem sản phẩm có trong giỏ hàng không
            const [existingProduct] = await connection.query(
                'SELECT * FROM giohang WHERE idgiohanghang = ?',
                [idgiohang]
            );
    
            if (existingProduct.length === 0) {
                return res.status(404).json({ message: 'Product not found in cart' });
            }
    
            // Nếu tồn tại thì xóa
            await connection.query(
                'DELETE FROM giohang WHERE idgiohanghang = ?',
                [idgiohang]
            );
    
            return res.status(200).json({ message: 'Product removed from cart' });
        } catch (error) {
            console.error('Error in removeFromCart:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },    
    async removeMultipleFromCart(req, res) {
        try {
            const { idgiohangArray } = req.body; // Nhận danh sách ID từ request body
    
            if (!Array.isArray(idgiohangArray) || idgiohangArray.length === 0) {
                return res.status(400).json({ message: 'Invalid request. Provide an array of product IDs.' });
            }
    
            console.log("IDs cần xóa:", idgiohangArray); // Debug log
    
            // Xóa các sản phẩm có ID nằm trong mảng
            const placeholders = idgiohangArray.map(() => '?').join(','); // Tạo dấu ? cho truy vấn SQL
            const query = `DELETE FROM giohang WHERE idgiohanghang IN (${placeholders})`;
    
            await connection.query(query, idgiohangArray);
    
            return res.status(200).json({ message: 'Products removed from cart' });
        } catch (error) {
            console.error('Error in removeMultipleFromCart:', error);
            return res.status(500).json({ message: 'Server error' });
        }
    },    

    async changeQuantity(req, res) {
        const { idmau, status } = req.body;
    
        try {
            const idkhachhang = req.user.id;
    
            // Kiểm tra xem sản phẩm có trong giỏ hàng không
            const [existingProduct] = await connection.query(
                'SELECT * FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                [idkhachhang, idmau]
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
                        'DELETE FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                        [idkhachhang, idmau]
                    );
                    return res.status(200).json({ message: 'Product removed from cart' });
                } else {
                    // Nếu số lượng > 0, chỉ cập nhật số lượng
                    await connection.query(
                        'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                        [newQuantity, idkhachhang, idmau]
                    );
                    return res.status(200).json({ message: 'Product quantity decreased' });
                }
            }
    
            if (status === 'increase') {
                // Tăng số lượng lên 1
                newQuantity = existingProduct[0].sl + 1;
    
                await connection.query(
                    'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                    [newQuantity, idkhachhang, idmau]
                );
                return res.status(200).json({ message: 'Product quantity increased' });
            }
    
            // Nếu status không phải 'increase' hoặc 'decrease'
            return res.status(400).json({ message: 'Invalid status, must be "increase" or "decrease"' });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }      
};

export default CartController;
