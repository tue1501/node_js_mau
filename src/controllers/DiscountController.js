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

        // Kiểm tra dữ liệu bắt buộc
        if (!tenGiamGia || !ngayBatDau || !ngayKetThuc || !giamGia || !dangGiamGia || !giamIn || !giamAx || !soLuong) {
            return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
        }

        // Kiểm tra xem tenGiamGia đã tồn tại chưa
        const [existingVoucher] = await connection.execute(
            'SELECT tenGiamGia FROM giamgia WHERE tenGiamGia = ?',
            [tenGiamGia]
        );

        if (existingVoucher.length > 0) {
            return res.status(400).json({ message: 'Tên voucher đã tồn tại, vui lòng chọn tên khác!' });
        }

        // Thêm voucher mới vào bảng giamgia
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
            error: err.message, // Trả về chi tiết lỗi
        });
    }
};

// Cập nhật voucher theo ID
const updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenGiamGia, ngayBatDau, ngayKetThuc, moTa, giamGia, dangGiamGia, giamIn, giamAx, soLuong } = req.body;

        // Kiểm tra tên có trùng nhưng không tính voucher hiện tại
        const [existingVoucher] = await connection.execute(
            'SELECT tenGiamGia FROM giamgia WHERE tenGiamGia = ? AND idGiamGia != ?',
            [tenGiamGia, id]
        );

        if (existingVoucher.length > 0) {
            return res.status(400).json({ message: 'Tên voucher đã tồn tại, vui lòng chọn tên khác!' });
        }

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


const deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;

        // Bắt đầu một transaction để đảm bảo tính toàn vẹn dữ liệu
        await connection.beginTransaction();

        // Cập nhật idGiamGia trong donhang thành NULL
        const [donhangResult] = await connection.execute(
            'UPDATE donhang SET idGiamGia = NULL WHERE idGiamGia = ?',
            [id]
        );

        // Xóa tất cả bản ghi trong chitietgiamgia liên quan đến idGiamGia
        const [chitietResult] = await connection.execute(
            'DELETE FROM chitietgiamgia WHERE idGiamGia = ?',
            [id]
        );

        // Xóa bản ghi trong giamgia
        const [giamgiaResult] = await connection.execute(
            'DELETE FROM giamgia WHERE idGiamGia = ?',
            [id]
        );

        // Kiểm tra xem có bản ghi nào trong giamgia bị xóa không
        if (giamgiaResult.affectedRows === 0) {
            await connection.rollback(); // Hoàn tác nếu không tìm thấy voucher
            return res.status(404).json({ message: 'Voucher không tồn tại' });
        }

        // Commit transaction nếu mọi thứ thành công
        await connection.commit();

        return res.status(200).json({
            message: 'Voucher và các dữ liệu liên quan đã được xử lý',
            updatedDonhangRows: donhangResult.affectedRows,
            deletedChitietRows: chitietResult.affectedRows,
            deletedGiamgiaRows: giamgiaResult.affectedRows
        });
    } catch (err) {
        // Rollback transaction nếu có lỗi
        await connection.rollback();
        console.error('Lỗi khi xóa voucher:', err);
        return res.status(500).json({
            message: 'Lỗi khi xóa voucher',
            error: err.message
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
