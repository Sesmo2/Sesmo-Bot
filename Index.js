const { default: makeWASocket, useSingleFileAuthState, makeWALegacySocket, makeWASocketOptions } = require('@whiskeysockets/baileys');
const { DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, useMultiFileAuthState, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const commandHandler = require('./lib/commandHandler');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startBot(authType = 'qr') {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: authType === 'qr',
    logger: pino({ level: 'silent' }),
    browser: ['Sesmo-Bot', 'Chrome', '1.0'],
  });

  // Generate pairing code if chosen
  if (authType === 'pairing') {
    const code = await sock.requestPairingCode('YOUR_PHONE_NUMBER_HERE'); // Replace with your phone number
    console.log('\nPairing Code:', code);
  }

  // Handle messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (text.startsWith('!')) {
      await commandHandler(sock, msg, text);
    }
  });

  // Save credentials
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot(authType);
    } else if (connection === 'open') {
      console.log('Bot connected to WhatsApp!');
      sock.sendMessage(sock.user.id, { text: '✅ Sesmo-Bot is now online!' }); // Send confirmation message
    }
  });
}

// Ask user which method to use
rl.question('Login with: (1) QR Code, (2) Pairing Code? ', (choice) => {
  if (choice === '2') {
    startBot('pairing');
  } else {
    startBot('qr');
  }
  rl.close();
});
