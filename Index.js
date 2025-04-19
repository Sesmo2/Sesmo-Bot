const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const updateCode = require('./server'); // Connect to web UI
require('dotenv').config();

const startSocket = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['Sesmo-Bot', 'Safari', '1.0.0'],
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, pairingCode } = update;

        if (qr) {
            console.log('Scan QR:', qr);
            updateCode(`Scan this QR:\n${qr}`);
        }

        if (pairingCode) {
            console.log('Pairing code:', pairingCode);
            updateCode(`Pairing Code:\n${pairingCode}`);
        }

        if (connection === 'open') {
            console.log('✅ Connected to WhatsApp');
            await sendSessionToSelf(sock);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startSocket();
        }
    });

    // Message event
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

        if (body === '!help') {
            await sock.sendMessage(from, { text: 'Hello! I am Sesmo-Bot. Try !ai <question>, !status' });
        }

        if (body.startsWith('!ai ')) {
            const reply = `Pretend I'm AI: You asked "${body.slice(4)}"`;
            await sock.sendMessage(from, { text: reply });
        }

        if (body === '!status') {
            const status = msg?.pushName ? `${msg.pushName} viewed the bot.` : 'Status accessed';
            await sock.sendMessage(from, { text: status });
        }
    });
};

const sendSessionToSelf = async (sock) => {
    const sessionId = uuidv4();
    const owner = process.env.OWNER_NUMBER;
    if (!owner) return console.warn("OWNER_NUMBER not set in .env");
    await sock.sendMessage(owner, { text: `✅ Your session ID is:\n\n${sessionId}` });
    console.log("Session ID sent to your WhatsApp.");
};

startSocket();