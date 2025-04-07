import express from "express";
import fetch from "node-fetch"; // Cần cài thêm: npm install node-fetch

const app = express();
app.use(express.json());

// API gửi thông báo qua Expo
app.post("/send-notification", async (req, res) => {
  const { title, body, token } = req.body;
  console.log(req.body);
  const pushToken = token || "ExponentPushToken[soy2kbGJONSzlZBnkTJJ3T]";
  if (!pushToken) {
    return res.status(400).json({ success: false, error: "Token is required" });
  }

  const message = {
    to: pushToken,
    sound: "default",
    title: title || "Chào bạn!",
    body: body || "Đây là một thông báo từ Expo",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    console.log("Notification sent successfully:", result);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server đang chạy trên cổng 3000");
});