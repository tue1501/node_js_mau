import connection from '../config/database.js'
import jwt from 'jsonwebtoken';
const orderbyid = async (req, res) => {
    const id = req.user.id;

    try {
        // Lấy danh sách đơn hàng của khách hàng, bao gồm cả ghi chú
        const [orders] = await connection.execute(
            `SELECT iddonhang, ghichu FROM donhang WHERE idKhachHang = ?`,
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
                trangthai = 0
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
        // Lấy tất cả đơn hàng cùng với tên khách hàng
        const [orders] = await connection.execute(
            `SELECT dh.iddonhang, dh.idKhachHang, dh.ghichu, kh.hoten
            FROM donhang dh
            JOIN khachhang kh ON dh.idKhachHang = kh.idKhachHang`
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
                tenKhachHang: order.hoten, // Lấy tên khách hàng
                ghichu: order.ghichu, // Lấy ghi chú từ bảng donhang
                products: updatedProducts
            });
        }

        return res.status(200).json({ data: orderDetails });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching orders',
            error: err,
        });
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
                -- Lấy ảnh từ bảng màu, nếu không có thì lấy ảnh từ bảng sản phẩm
                COALESCE(mh.hinhanh, p.hinhanh) AS hinhanh
            FROM chitietdonhang c
            LEFT JOIN sanpham_mau_hinhanh mh ON c.idMau = mh.id
            LEFT JOIN sanpham p ON mh.idSanPham = p.idSanPham
            WHERE c.idDonhang = ?`,
            [order.iddonhang]
        );

        // // Cập nhật đường dẫn hình ảnh đầy đủ
        // const updatedProducts = products.map(product => ({
        //     ...product,
        //     hinhanh: product.hinhanh 
        // }));

        // Trả về thông tin đơn hàng và sản phẩm
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

export default {
    orderbyid,
    deleteorder,
    getAllOrders,
    getOrderById
};