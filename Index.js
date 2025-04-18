// index.js

const {
    default: makeWASocket,
    useSingleFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode,
    proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function startBot() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        patch: {
            ...store.state,
        },
        auth: state,
    });

    store.bind(sock.ev);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot is online!');
        }
    });

    sock.ev.on('creds.update', saveState);

    // --- Message Handling ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            const msg = messages[0];
            if (!msg.key.fromMe) {
                console.log('Received message:', msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'No text');

                // Example: Respond to a specific command
                if (msg.message?.conversation === '!ping') {
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' });
                }
            }
        }
    });

    // --- Optional: Presence Update Handling (e.g., for auto-view status - implementation might vary) ---
    // sock.ev.on('presence.update', async ({ id, presences }) => {
    //     const sender = Object.keys(presences)[0];
    //     if (presences[sender]?.lastSeen) {
    //         // Your auto-view status logic here
    //         console.log(`User ${id} was last seen at ${new Date(presences[sender].lastSeen * 1000).toLocaleString()}`);
    //         // Example: Mark status as seen (implementation details might require further research)
    //         // await sock.readMessages([{ remoteJid: id, id: 'status@broadcast' }]);
    //     }
    // });
}

startBot();
