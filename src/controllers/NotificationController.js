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

const detailNotification = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID thông báo' });
        }

        const [rows] = await connection.execute(
            'SELECT * FROM thongbao WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }

        return res.status(200).json({ data: rows[0] });
    } catch (error) {
        console.error('Lỗi khi lấy thông báo:', error);
        return res.status(500).json({ message: 'Lỗi server', error });
    }
}



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

  const deletetokenbyid = async (req, res) => {
    const id = req.user.id;
    const { token } = req.body;
  
    if (!id || !token) {
      return res.status(400).json({ message: 'Thiếu id hoặc token' });
    }
  
    try {
      // Lấy token hiện tại từ DB
      const [rows] = await connection.execute(
        'SELECT token FROM khachhang WHERE idKhachHang = ?',
        [id]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Khách hàng không tồn tại' });
      }
  
      let tokenArray = [];
  
      try {
        // Ép kiểu chuỗi cho rawToken
        const rawToken = String(rows[0].token); // Ép kiểu chuỗi nếu là number, null hay các kiểu không phải chuỗi
  
        if (!rawToken || rawToken.trim() === '') {
          tokenArray = [];
        } else if (rawToken.trim().startsWith('[')) {
          tokenArray = JSON.parse(rawToken); // Nếu là chuỗi JSON hợp lệ
        } else if (rawToken.includes(',')) {
          tokenArray = rawToken.split(',').map(t => t.trim()); // Nếu chuỗi có dấu phẩy
        } else {
          tokenArray = [rawToken.trim()]; // Nếu chỉ là chuỗi đơn
        }
      } catch (err) {
        console.error('Lỗi khi parse token array:', err);
        tokenArray = [];
      }
  
      // Kiểm tra xem token có trong mảng không
      if (!tokenArray.includes(token)) {
        return res.status(400).json({ message: 'Token không tồn tại trong hệ thống!' });
      }
  
      // Xóa chỉ một token khỏi mảng
      tokenArray = tokenArray.filter((t, index) => {
        if (t === token && index === tokenArray.indexOf(t)) {
          return false; // Xóa chỉ token đầu tiên tìm thấy
        }
        return true;
      });
  
      // Cập nhật lại vào DB dưới dạng JSON
      await connection.execute(
        'UPDATE khachhang SET token = ? WHERE idKhachHang = ?',
        [JSON.stringify(tokenArray), id]
      );
  
      return res.status(200).json({
        message: 'Token đã được xóa thành công!',
        tokens: tokenArray,
      });
  
    } catch (error) {
      console.error('Lỗi khi xóa token:', error);
      return res.status(500).json({
        message: 'Lỗi hệ thống khi xóa token!',
        error: error.message,
      });
    }
  };
  
  

  



export default { getNotification, updateNotification, sendNotificationToUser, deleteNotification, deletetokenbyid,detailNotification };
  