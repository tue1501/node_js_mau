import connection from '../config/database.js'
import jwt from 'jsonwebtoken';
const orderbyid = async (req, res) => {
    const id = req.user.id;

    try {
        // Lấy danh sách đơn hàng của khách hàng, bao gồm cả ghi chú
        const [orders] = await connection.execute(
            `SELECT iddonhang, ghichu, trangthai, ngaytao, ngaygiaohang, tongtien,tt_cod, tt_online FROM donhang WHERE idKhachHang = ?`,
            [id]
        );

        const orderDetails = [];

        for (const order of orders) {
            // Lấy sản phẩm trong đơn hàng, đổi idSanPham thành idMau
            const [products] = await connection.execute(
                `SELECT 
                    p.idSanPham,
                    c.idMau,
                    c.sl,
                    p.tensp,
                    p.gia,
                    p.xuatxu,
                    p.tonkho,
                    p.mota,
                    -- Lấy ảnh từ bảng màu, nếu không có thì lấy ảnh từ bảng sản phẩm
                    COALESCE(mh.hinhanh, p.hinhanh) AS hinhanh
                FROM chitietdonhang c
                LEFT JOIN sanpham_mau_hinhanh mh ON c.idMau = mh.id
                LEFT JOIN sanpham p ON mh.idSanPham = p.idSanPham
                LEFT JOIN donhang dh ON c.idDonhang = dh.iddonhang
                WHERE c.idDonhang = ?`,
                [order.iddonhang]
            );

            // Cập nhật đường dẫn hình ảnh đầy đủ
            const updatedProducts = products.map(product => ({
                ...product,
                hinhanh: product.hinhanh 
            }));
            // Thêm vào mảng kết quả
            orderDetails.push({
                iddonhang: order.iddonhang,
                trangthai: order.trangthai,
                tt_cod: order.tt_cod,
                ngaytao: order.ngaytao,
                ngaygiaohang: order.ngaygiaohang,
                tongtien: order.tongtien,
                tt_online: order.tt_online,
                ghichu: order.ghichu, // Lấy ghi chú từ bảng donhang
                products: updatedProducts
            });
        }

        return res.status(200).json({ data: orderDetails });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching products by details',
            error: err,
        });
    }
};


const deleteorder = async (req, res) => {
    const id = req.user.id; 
    const { iddonhang } = req.body; // Lấy thông tin từ body
    try {
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        if (!iddonhang) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        const [rows] = await connection.query(
            'SELECT idKhachHang FROM donhang WHERE idDonHang = ? AND idKhachHang = ?',
            [iddonhang, id]
        );
        if (rows.length !== 1) {
            return res.status(404).json({ message: 'Order not found or does not belong to this customer!' });
        }
                
        // Cập nhật thông tin khách hàng
        const query = `
            UPDATE donhang 
            SET
                trangthai = 4
            WHERE iddonhang = ?
        `;
        const [result] = await connection.execute(query, [
            iddonhang,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        return res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating customer', error });
    }
};


const getAllOrders = async (req, res) => {
    try {
        // Truy vấn đơn hàng với trường ngày tạo (ngaytao) và ngày giao hàng (ngaygiaohang) trong khoảng thời gian từ fromDate đến toDate
        const [orders] = await connection.execute(
            `SELECT idDonhang, tenkh, sdtkh, ngaytao, ngaygiaohang, tongtien, ghichu, trangthai
            FROM donhang`,
        );
        
        // Kiểm tra nếu không có đơn hàng nào
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không có đơn hàng nào trong khoảng thời gian này' });
        }

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Lỗi khi lấy đơn hàng :', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

const getOrderById = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Lấy thông tin đơn hàng theo ID
        const [orders] = await connection.execute(
            `SELECT dh.iddonhang, dh.ghichu, kh.hoten
            FROM donhang dh
            JOIN khachhang kh ON dh.idKhachHang = kh.idKhachHang
            WHERE dh.iddonhang = ?`,
            [id]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found!' });
        }
        
        const order = orders[0];        // Lấy sản phẩm trong đơn hàng, đổi idSanPham thành idMau
        const [products] = await connection.execute(
            `SELECT 
            p.idSanPham,
            c.idMau,
            c.sl,
            p.tensp,
            p.gia,
            p.xuatxu,
            p.tonkho,
            p.mota,
            c.*,
            -- Lấy ảnh từ bảng màu, nếu không có thì lấy ảnh từ bảng sản phẩm
            COALESCE(mh.hinhanh, p.hinhanh) AS hinhanh
            FROM chitietdonhang c
            LEFT JOIN sanpham_mau_hinhanh mh ON c.idMau = mh.id
            LEFT JOIN sanpham p ON mh.idSanPham = p.idSanPham
            WHERE c.idDonhang = ?`,
            [order.iddonhang]
        );
        return res.status(200).json({
            iddonhang: order.iddonhang,
            hoten: order.hoten,
            ghichu: order.ghichu,
            products: products
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching order by ID',
            error: err,
        });
    }
};
const order = async (req, res) => {
    const { id } = req.params;
    const  idkhachhang  = req.user.id;
    try {
        // Lấy thông tin đơn hàng theo ID
        const [orders] = await connection.execute(
            `SELECT idDonhang, trangthai, tt_cod, tt_online
            FROM donhang 
            WHERE idDonhang = ? AND idKhachHang = ?`,
            [id, idkhachhang]
        );
        return res.status(200).json({
            orders: orders,
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching order by ID',
            error: err,
        });
    }
};
const updateorder = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // "increase" hoặc "decrease"

    try {
        if (!id || !status) {
            return res.status(400).json({ message: 'Missing order ID or status' });
        }

        // Kiểm tra xem đơn hàng có tồn tại không
        const [rows] = await connection.query(
            'SELECT trangthai FROM donhang WHERE idDonHang = ?',
            [id]
        );

        if (rows.length !== 1) {
            return res.status(404).json({ message: 'Order not found!' });
        }

        let newTrangThai = rows[0].trangthai;

        // Kiểm tra giới hạn trước khi cập nhật
        if (status === "increase") {
            if (newTrangThai >= 4) {
                return res.status(400).json({ message: 'Order status cannot be greater than 4' });
            }
            newTrangThai += 1;
        } else if (status === "decrease") {
            if (newTrangThai <= 0) {
                return res.status(400).json({ message: 'Order status cannot be less than 0' });
            }
            newTrangThai -= 1;
        } else {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Cập nhật trạng thái trong database
        const query = `UPDATE donhang SET trangthai = ? WHERE idDonHang = ?`;
        const [result] = await connection.execute(query, [newTrangThai, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found or update failed' });
        }

        return res.status(200).json({ message: 'Order updated successfully', newTrangThai });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating order', error });
    }
};


export default {
    orderbyid,
    deleteorder,
    getAllOrders,
    getOrderById,
    order,
    updateorder
};