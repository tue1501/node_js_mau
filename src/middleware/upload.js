import { fileURLToPath } from "url";
import path from "path";
import multer from "multer";

// Tạo __dirname theo cách thủ công trong ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads")); // Lưu vào thư mục uploads
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Đổi tên file để tránh trùng lặp
    }
});

// Kiểm tra định dạng file (chỉ cho phép ảnh)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",  // JPG
        "image/png",   // PNG
        "image/jpg",   // JPG
        "image/webp",  // WEBP
        "image/gif",   // GIF
        "image/svg+xml"// SVG
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);  // Cho phép tải lên nếu đúng định dạng
    } else {
        cb(new Error("Chỉ hỗ trợ các định dạng ảnh JPG, PNG, WEBP, GIF, SVG"), false); // Nếu không đúng định dạng
    }
};

// Khởi tạo Multer hỗ trợ upload nhiều ảnh với trường "hinhanh"
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn ảnh 5MB
});

// Middleware để upload nhiều ảnh cùng lúc
export const uploadMultiple = upload.array("hinhanh", 10); // Tối đa 10 ảnh

export default upload;
