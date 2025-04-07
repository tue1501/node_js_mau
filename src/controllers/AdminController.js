import connection from '../config/database.js'
import dotenv from 'dotenv';
dotenv.config();

const repcomment = async (req, res) => {
    try {
        // Lấy id từ URL params
        const { id } = req.params;
        const idQtv = req.admin.id;
        const { traloi } = req.body;

        const ngaytraloi = new Date().toISOString().slice(0, 19).replace('T', ' '); // Định dạng YYYY-MM-DD HH:MM:SS
        // Kiểm tra dữ liệu đầu vào
        if (!id || !idQtv || !traloi) {
            return res.status(400).json({ message: 'Thiếu id, idQtv hoặc nội dung trả lời!' });
        }

        // Thêm phản hồi vào bảng danhgia
        const query = `
            UPDATE danhgia 
            SET idQtv = ?, ngaytraloi = ?, traloi = ? 
            WHERE id = ?
        `;
        const [result] = await connection.execute(query, [idQtv, ngaytraloi, traloi, id]);

        // Kiểm tra xem có bản ghi nào được cập nhật không
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy đánh giá để trả lời!' });
        }

        // Lấy tất cả các trường trong bảng danhgia sau khi cập nhật
        const [rows] = await connection.execute('SELECT * FROM danhgia WHERE id = ?', [id]);

        return res.status(200).json({
            message: 'Phản hồi đã được gửi thành công!',
            data: rows[0] // Trả về bản ghi vừa được cập nhật
        });
    } catch (error) {
        console.error('Lỗi khi trả lời đánh giá:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi trả lời đánh giá!', error: error.message });
    }
};


export default { repcomment }