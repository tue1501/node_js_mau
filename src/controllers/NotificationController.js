import connection from '../config/database.js'
import sendNotification from '../middleware/notification.js';
import dotenv from 'dotenv';
dotenv.config();

const getNotification = async (req, res) => {
    const idKhachHang = req.user.id;
    try {
        if (!idKhachHang) {
        return res.status(400).json({ message: 'Thiếu ID khách hàng' });
        }

        const [rows] = await connection.execute(
        'SELECT * FROM thongbao WHERE idKhachHang = ? ORDER BY ngaytao DESC',
        [idKhachHang]
        );

        return res.status(200).json({ data: rows });
    } catch (error) {
        console.error('Lỗi khi lấy thông báo:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
};
const updateNotification = async (req, res) => {
    const { idThongBao } = req.body;
    
    try {
      if (!idThongBao) {
        return res.status(400).json({ message: 'Thiếu ID thông báo hoặc trạng thái' });
      }
  
      const [result] = await connection.execute(
        'UPDATE thongbao SET trangthai = ? WHERE id = ?',
        [0, idThongBao]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }
      const [rows] = await connection.execute(
        'SELECT * FROM thongbao WHERE id = ?',
        [idThongBao]
    );
      return res.status(200).json({ message: 'Cập nhật trạng thái thành công' , data: rows });
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      return res.status(500).json({ message: 'Lỗi server', error });
    }
};
 
const deleteNotification = async (req, res) => {
    const { id } = req.params;
    try {
      if (!id) {
        return res.status(400).json({ message: 'Thiếu ID thông báo' });
      }
  
      const [result] = await connection.execute(
        'DELETE FROM thongbao WHERE id = ?',
        [id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }
  
      return res.status(200).json({ message: 'Xóa thông báo thành công' });
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      return res.status(500).json({ message: 'Lỗi server', error });
    }
  };

const sendNotificationToUser = async (req, res) => {
    const { title, body, token } = req.body;
  
    if (!token) {
      return res.status(400).json({ message: 'Thiếu token' });
    }
  
    try {
      const result = await sendNotification({ title, body, token });
      res.status(200).json({
        message: 'Thông báo đã được gửi thành công',
        info: result,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Lỗi khi gửi thông báo',
        error: error.message,
      });
    }
  };


export default { getNotification, updateNotification,sendNotificationToUser, deleteNotification };
  