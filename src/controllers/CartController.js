import c from 'config';
import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu
import jwt from 'jsonwebtoken';
const CartController = {
    // Thêm sản phẩm vào giỏ hàng
    async addToCart(req, res) {
        try {
            const idkhachhang = req.user.id;
            let { idmau, sl } = req.body;

            if (!idmau) {
                return res.status(400).json({ message: 'Product Color ID is required' });
            }

            idmau = parseInt(idmau);
            if (isNaN(idmau)) {
                return res.status(400).json({ message: 'Invalid Product Color ID' });
            }

            // Kiểm tra idmau có tồn tại không
            const [colorExists] = await connection.query(
                'SELECT id, so_luong FROM sanpham_mau_hinhanh WHERE id = ?',
                [idmau]
            );

            if (colorExists.length === 0) {
                return res.status(404).json({ message: 'Product color not found' });
            }

            const tonkho = colorExists[0].so_luong; // Số lượng tồn kho
            const quantityToAdd = parseInt(sl) > 0 ? parseInt(sl) : 1;

            // Lấy số lượng hiện tại trong giỏ hàng
            const [existingProduct] = await connection.query(
                'SELECT sl FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                [idkhachhang, idmau]
            );

            let existingQuantity = existingProduct.length > 0 ? existingProduct[0].sl : 0;
            let newQuantity = existingQuantity + quantityToAdd;

            // Kiểm tra tồn kho trước khi thêm/cập nhật
            if (newQuantity > tonkho) {
                return res.status(400).json({
                    message: `Only ${tonkho - existingQuantity} more items can be added to cart due to stock limitations.`,
                });
            }
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
                `SELECT c.idgiohanghang , c.idMau, c.sl, 
                        sp.tensp, sp.xuatxu, sp.diemtb, sp.gia, m.so_luong, sp.mota, 
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
    
            // Kiểm tra sản phẩm có trong giỏ hàng không
            const [existingProduct] = await connection.query(
                'SELECT sl FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                [idkhachhang, idmau]
            );
    
            if (existingProduct.length === 0) {
                return res.status(404).json({ message: 'Product not found in cart' });
            }
    
            let currentQuantity = existingProduct[0].sl;
    
            // Lấy số lượng tồn kho của sản phẩm
            const [productStock] = await connection.query(
                'SELECT so_luong FROM sanpham_mau_hinhanh WHERE id = ?',
                [idmau]
            );
    
            if (productStock.length === 0) {
                return res.status(404).json({ message: 'Product not found in stock' });
            }
    
            const tonkho = productStock[0].so_luong;
            let newQuantity = currentQuantity;
    
            if (status === 'decrease') {
                newQuantity = currentQuantity - 1;
    
                if (newQuantity <= 0) {
                    // Xóa sản phẩm khỏi giỏ nếu số lượng <= 0
                    await connection.query(
                        'DELETE FROM giohang WHERE idkhachhang = ? AND idMau = ?',
                        [idkhachhang, idmau]
                    );
                    return res.status(200).json({ message: 'Product removed from cart' });
                } else {
                    // Cập nhật số lượng nếu > 0
                    await connection.query(
                        'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                        [newQuantity, idkhachhang, idmau]
                    );
                    return res.status(200).json({ message: 'Product quantity decreased' });
                }
            }
    
            if (status === 'increase') {
                newQuantity = currentQuantity + 1;
    
                if (newQuantity > tonkho) {
                    return res.status(400).json({
                        message: `Cannot increase quantity`,
                    });
                }
    
                await connection.query(
                    'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                    [newQuantity, idkhachhang, idmau]
                );
                return res.status(200).json({ message: 'Product quantity increased' });
            }
    
            return res.status(400).json({ message: 'Invalid status, must be "increase" or "decrease"' });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },    
    async addCart(req, res) {
        try {
            // Lấy ID khách hàng từ token
            const idkhachhang = req.user.id;
    
            // Lấy idmau và số lượng từ request body
            let { idmau, sl } = req.body;
            
            if (!idmau) {
                return res.status(400).json({ message: 'Product Color ID is required' });
            }   

            if (!Number.isInteger(sl) || sl <= 0) {
                return res.status(400).json({ message: 'Quantity must be a positive integer' });
            }
    
            const [product] = await connection.query(
                'SELECT so_luong FROM sanpham_mau_hinhanh WHERE id = ?',
                [idmau]
            );
    
            if (product.length === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }
    
            const so_luong = product[0].so_luong;
    
            if (sl > so_luong) {
                return res.status(400).json({
                    message: `Not enough stock. Available: ${so_luong}, Requested: ${sl}`
                });
            }
            await connection.query(
                'UPDATE giohang SET sl = ? WHERE idkhachhang = ? AND idMau = ?',
                [sl, idkhachhang, idmau]
            );
            return res.status(200).json({ message: 'Product quantity updated in cart' });
        } catch (error) {
            console.error('Error in addToCart:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },
};

export default CartController;
