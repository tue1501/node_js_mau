// middleware/notification.js
import fetch from 'node-fetch';

// Hàm gửi thông báo
async function sendNotification({ title, body, token }) {
  // Kiểm tra xem có token không
  const pushToken = token ;  // Token mặc định nếu không có token trong body
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
    // Gửi thông báo tới Expo
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;  // Trả về kết quả cho controller gọi hàm này
  } catch (error) {
    console.error("Error sending notification:", error);
    throw new Error(error.message); // Ném lỗi để controller có thể xử lý
  }
}

export default sendNotification;
