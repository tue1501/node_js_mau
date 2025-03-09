// config/database.js
import mysql from 'mysql2';

// Tạo kết nối cơ sở dữ liệu MySQL
const connection = mysql.createConnection({
    host: 'mysql-121bae9e-tuedeptrai1501-28a4.h.aivencloud.com',
    port: '23358',
    user: 'avnadmin',  // Thay đổi thành thông tin của bạn
    password: 'AVNS_9FCh7TMB3FGxqIgMOM2',  // Thay đổi mật khẩu nếu có
    database: 'petland'  // Thay đổi tên cơ sở dữ liệu
    
}); 


export default connection.promise();  // Sử dụng promise để tương thích với async/await
