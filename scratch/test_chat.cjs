const axios = require("axios");

async function test() {
  try {
    const response = await axios.post("http://localhost:3000/api/chat", {
      message: "how long does it take to nairobi?",
      sessionId: "test-session-123",
      locale: "en",
      isAfterHours: false
    });
    
    console.log("=== Chatbot API Test Output ===");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("===============================");
  } catch (e) {
    console.error("Test failed:", e.message);
  }
}

test();
