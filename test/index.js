fetch("https://rethu.app.n8n.cloud/webhook/phish-check", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain"
  },
  body: "{\r\n  \"url\": \"https://x.com/\"\r\n}"
})
  .then(res => res.text())
  .then(text => {
    console.log("First response:", text);
  })
  .catch(err => console.error(err));
