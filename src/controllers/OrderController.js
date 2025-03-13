import connection from '../config/database.js'
import jwt from 'jsonwebtoken';
const orderbyid = async (req, res) => {
    const id = req.user.id;
    const baseURL = "http://localhost:8080";

    try {
        // Lấy danh sách đơn hàng của khách hàng, bao gồm cả ghi chú
        const [orders] = await connection.execute(
            `SELECT iddonhang, ghichu FROM donhang WHERE idKhachHang = ?`,
            [id]
        );

        const orderDetails = [];

        for (const order of orders) {
            // Lấy sản phẩm trong đơn hàng và thông tin ghi chú từ bảng donhang
            const [products] = await connection.execute(
                `SELECT p.*, c.sl, CONCAT(?, p.hinhanh) AS hinhanh 
                 FROM chitietdonhang c 
                 LEFT JOIN sanpham p ON c.idSanPham = p.idSanPham  
                 WHERE c.idDonhang = ?`,
                [baseURL, order.iddonhang]
            );

            // Thêm vào mảng kết quả 
            orderDetails.push({
                iddonhang: order.iddonhang,
                ghichu: order.ghichu, // Lấy ghi chú từ bảng donhang
                products: products
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
export default {
    orderbyid,deleteorder
};