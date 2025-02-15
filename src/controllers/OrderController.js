import connection from '../config/database.js'
const orderbyid = async (req, res) => {
    const { id } = req.params; // ID của khách hàng
    try {
        const [orders] = await connection.execute
        (`SELECT iddonhang
            FROM donhang
            WHERE idKhachHang = ?`,
            [id]);
        const orderDetails = [];
        for (const order of orders) {
                    // Lấy sản phẩm thuộc chi tiết loại sản phẩm
                    const [products] = await connection.execute(
                        'SELECT p.tensp , p.gia,c.sl FROM chitietdonhang c LEFT JOIN sanpham p ON c.idSanPham = p.idSanPham  WHERE idDonhang = ?',
                        [order.iddonhang]
                    );
                    // Thêm vào mảng kết quả 
                    orderDetails.push({
                        order: order.iddonhang,
                        products: products
                    });
                }
        return res.status(200).json({ data: orderDetails });
    }
    catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching products by details',
            error: err,
        });
    }
};
const deleteorder = async (req, res) => {
    const { id } = req.params;
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