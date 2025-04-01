import express from "express";
import path from "path";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

// Khởi tạo Firebase Admin SDK
const serviceAccount = require("./config/petland-1b626-firebase-adminsdk-fbsvc-c32ef2fafd.json.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// API gửi thông báo FCM
app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: {
      title: title || "Chào bạn!",
      body: body || "Đây là một thông báo từ Firebase Cloud Messaging"
    },
    token: token
  };

  try {
    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chạy server
app.listen(3000, () => {
  console.log("Server đang chạy trên cổng 3000");
});
