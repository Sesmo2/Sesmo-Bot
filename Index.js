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

// Optional: in-memory store for better logging/debugging
const store = makeInMemoryStore({
  logger: console
});
store.readFromFile('./session_store.json');
setInterval(() => {
  store.writeToFile('./session_store.json');
}, 10_000);

// Start the bot
async function startBot() {
  // Auth state from session folder
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using Baileys version: ${version}, latest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: console
  });

  store.bind(sock.ev); // bind store to socket events

  // Save updated credentials when changed
  sock.ev.on('creds.update', saveCreds);

  // Connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;

      console.log('Connection closed. Reconnecting:', shouldReconnect);

      if (shouldReconnect) {
        startBot(); // Reconnect
      }
    }

    if (connection === 'open') {
      console.log('Bot is now connected!');
    }
  });

  // Incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    const sender = jidNormalizedUser(msg.key.remoteJid);
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!body) return;

    console.log(`Message from ${sender}: ${body}`);

    if (body === '!help') {
      await sock.sendMessage(sender, {
        text: `Available commands:\n!help - Show this help message`
      });
    }
  });
}

startBot();