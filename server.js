const express = require('express');
const app = express();
const fs = require('fs');

let latestCode = ''; // to store pairing or QR code

// Public folder for HTML
app.use(express.static('public'));

// Endpoint to get the latest code
app.get('/code', (req, res) => {
  res.send(latestCode);
});

// Update code from main bot file
function setCode(code) {
  latestCode = code;
}

app.listen(3000, () => {
  console.log('Web server running on http://localhost:3000');
});

module.exports = { setCode };