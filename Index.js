const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeImage = null;
let pairingCodeText = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Sesmo-Bot', 'Chrome', '1.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrCodeImage = await QRCode.toDataURL(qr);
      pairingCodeText = null;
    }
    if (connection === 'open') {
      console.log('✅ Bot is connected!');
      qrCodeImage = null;
      pairingCodeText = null;
    }
  });

  sock.ev.on('creds.update', saveCreds);

  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode('123456789'); // Optional
      pairingCodeText = code;
      qrCodeImage = null;
    } catch (err) {
      console.log("Pairing code not available:", err.message);
    }
  }, 3000);
}

// Serve static HTML
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch current QR or pairing code
app.get('/status', (req, res) => {
  let html = '';
  if (qrCodeImage) {
    html += `<p>Scan this QR Code:</p><img src="${qrCodeImage}" />`;
  } else if (pairingCodeText) {
    html += `<p>Enter this pairing code in WhatsApp:</p><h2>${pairingCodeText}</h2>`;
  } else {
    html += `<p>✅ Bot is already connected or starting...</p>`;
  }
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  startBot();
});
