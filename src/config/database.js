// config/database.js
import mysql from 'mysql2';

// Tạo kết nối cơ sở dữ liệu MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // Thay đổi thành thông tin của bạn
    password: '',  // Thay đổi mật khẩu nếu có
    database: 'petland'  // Thay đổi tên cơ sở dữ liệu
});

export default connection.promise();  // Sử dụng promise để tương thích với async/await
