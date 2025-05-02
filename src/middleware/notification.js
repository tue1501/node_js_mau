// middleware/notification.js
import fetch from 'node-fetch';

// Hàm gửi thông báo
async function sendNotification({ title, body, token, data }) {
  const pushToken = token;
  if (!pushToken) {
    throw new Error("Token is required");
  }

  const message = {
    to: pushToken,
    sound: "default",
    title: title || "Chào bạn!",
    body: body || "Đây là một thông báo từ Petland",
    data,
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
    return result;
  } catch (error) {
    console.error("❌ Lỗi khi gửi thông báo:", error);
    throw new Error(error.message);
  }
}

async function sendNotificationall({ title, body }) {

  if (!Array.isArray() || tokens.length === 0) {
    throw new Error("Tokens array is required and cannot be empty");
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: title || "Chào bạn!",
    body: body || "Đây là một thông báo từ Petland",
  }));

  try {
    const responses = await Promise.all(
      messages.map((message) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        })
      )
    );

    const results = await Promise.all(responses.map((res) => res.json()));
    console.log(`🔔 Đã gửi thông báo tới ${tokens.length} tokens`);
    return results;
  } catch (error) {
    console.error("❌ Lỗi khi gửi thông báo:", error);
    throw new Error(error.message);
  }
}

export default sendNotification;
