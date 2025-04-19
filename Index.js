const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useSingleFileLegacyAuthState,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const fs = require('fs');

const store = makeInMemoryStore({ logger: console });
store.readFromFile('./session_store.json');
setInterval(() => {
  store.writeToFile('./session_store.json');
}, 10_000);

// Function to prompt user in terminal
const prompt = (query) => new Promise(resolve => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  });
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // we're using pairing code
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
    }

    // Show pairing code if needed
    if (update.pairingCode) {
      console.log(`Pairing Code: ${update.pairingCode}`);
    }
  });

  // If no existing session, trigger pairing code flow
  if (!fs.existsSync('./session/creds.json')) {
    const phoneNumber = await prompt('Enter your phone number (with country code): ');
    await sock.requestPairingCode(phoneNumber);
    console.log('Check your WhatsApp app and enter the code to link the bot.');
  }

  // Basic message handler
  sock.ev.on('messages.upsert', async ({