const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

// Import the setCode function from server.js to update the web page
const { setCode } = require('./server');

const store = makeInMemoryStore({
  logger: console
});
store.readFromFile('./session_store.json');
setInterval(() => {
  store.writeToFile('./session_store.json');
}, 10_000);

// Start the bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // No QR in terminal, using pairing code
    logger: console
  });

  store.bind(sock.ev);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, pairingCode } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;

      console.log('Connection closed. Reconnecting:', shouldReconnect);

      if (shouldReconnect) {
        startBot();
      }
    }

    if (connection === 'open') {
      console.log('Bot is now connected!');
      
      // Send a "Connected" DM to your WhatsApp number (optional)
      const phoneNumber = 'YOUR_PHONE_NUMBER@c.us'; // replace with your WhatsApp number
      const message = `The bot is successfully connected!`;
      await sock.sendMessage(phoneNumber, { text: message });

      // Optionally send the session ID
      const sessionMessage = `Session ID: ${state.keys.device[0].session}`;
      await sock.sendMessage(phoneNumber, { text: sessionMessage });
    }

    // If pairing code is generated, share it with the web page
    if (pairingCode) {
      console.log(`Pairing Code: ${pairingCode}`);
      setCode(pairingCode); // Send it to the web page
    }
  });

  // Initialize the socket and handle login
  await sock.connect();
}

startBot();