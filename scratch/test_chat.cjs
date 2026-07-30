const axios = require("axios");

async function test() {
  try {
    const response = await axios.post("http://localhost:3000/api/chat", {
      message: "quelles sont les exigences de visa pour la Belgique?",
      sessionId: "test-session-123",
      locale: "fr",
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
