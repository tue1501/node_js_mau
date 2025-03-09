import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu

// Lấy danh sách tất cả voucher
const getAllVouchers = async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT * FROM giamgia');
        return res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách voucher',
            error: err,
        });
    }
};

// Lấy voucher theo ID
const getVoucherById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await connection.execute('SELECT * FROM giamgia WHERE idGiamGia = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Voucher không tồn tại' });
        }

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi lấy voucher',
            error: err,
        });
    }
};

// Thêm voucher mới
const createVoucher = async (req, res) => {
    try {
        const { tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong } = req.body;

        if (!tenGiamGia || !ngayBatDau || !ngayKetThuc || !giamGia || !dangGiamGia || !giamIn || !giamAx || !soLuong) {
            return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
        }

        const [result] = await connection.execute(
            `INSERT INTO giamgia (tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong]
        );

        return res.status(201).json({
            message: 'Voucher đã được thêm thành công',
            data: {
                idGiamGia: result.insertId,
                tenGiamGia,
                ngayBatDau,
                ngayKetThuc,
                moTa,
                giamGia,
                dangGiamGia,
                giamIn,
                giamAx,
                soLuong,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi thêm voucher',
            error: err,
        });
    }
};

// Cập nhật voucher theo ID
const updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong } = req.body;

        const [result] = await connection.execute(
            `UPDATE giamgia 
             SET tenGiamGia = ?, ngayBatDau = ?, ngayKetThuc = ?, moTa = ?, giamGia = ?, dangGiamGia = ?, giamIn = ?, giamAx = ?, soLuong = ? 
             WHERE idGiamGia = ?`,
            [tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Voucher không tồn tại' });
        }

        return res.status(200).json({ message: 'Voucher đã được cập nhật thành công' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật voucher',
            error: err,
        });
    }
};

// Xóa voucher theo ID
const deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await connection.execute('DELETE FROM giamgia WHERE idGiamGia = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Voucher không tồn tại' });
        }

        return res.status(200).json({ message: 'Voucher đã bị xóa' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi xóa voucher',
            error: err,
        });
    }
};

export default {
    getAllVouchers,
    getVoucherById,
    createVoucher,
    updateVoucher,
    deleteVoucher
};
