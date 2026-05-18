async function test() {
  const message = 'Hello';
  const products = [];
  const response = await fetch("http://localhost:3000/api/ai/generate-chat-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, products }),
  });
  console.log(response.status);
  const text = await response.text();
  console.log(text);
}
test().catch(console.error);
