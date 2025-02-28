// Cấu hình nơi lưu trữ ảnh
import { fileURLToPath } from "url";
import path from "path";
import multer from "multer";

// Tạo __dirname theo cách thủ công trong ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads")); // Đường dẫn tương đối đến thư mục uploads
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});


// // Kiểm tra định dạng file (chỉ cho phép ảnh)
// const fileFilter = (req, file, cb) => {
//     const allowedTypes = ["hinhanh/jpeg", "hinhanh/png", "hinhanh/jpg"];
//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error("Chỉ hỗ trợ định dạng ảnh JPG, PNG"), false);
//     }
// };

// Khởi tạo Multer
const upload = multer({
    storage: storage,
    // fileFilter: fileFilter,
    // limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn ảnh 5MB
});

// module.exports = upload;
export default upload; 