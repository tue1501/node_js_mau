// middleware/notification.js
import fetch from 'node-fetch';

// Hàm gửi thông báo
async function sendNotification({ title, body, token }) {
  const pushToken = token;
  if (!pushToken) {
    throw new Error("Token is required");
  }

  const message = {
    to: pushToken,
    sound: "default",
    title: title || "Chào bạn!",
    body: body || "Đây là một thông báo từ Petland",
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
    console.log(`🔔 Đã gửi thông báo tới token: ${pushToken}`);
    return result;
  } catch (error) {
    console.error("❌ Lỗi khi gửi thông báo:", error);
    throw new Error(error.message);
  }
}


export default sendNotification;
