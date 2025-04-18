// index.js const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys'); const { Boom } = require('@hapi/boom'); const P = require('pino'); const fs = require('fs'); const { Configuration, OpenAIApi } = require("openai");

const config = require('./config'); const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const openai = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY, }));

async function connectToWhatsApp() { const { version } = await fetchLatestBaileysVersion(); const sock = makeWASocket({ version, logger: P({ level: 'silent' }), printQRInTerminal: true, auth: state, });

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
            connectToWhatsApp();
        }
    } else if (connection === 'open') {
        console.log('Connected to WhatsApp!');
    }
});

sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    if (text === '!help') {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Commands: !help, !ai <question>' });
    } else if (text.startsWith('!ai')) {
        const prompt = text.replace('!ai', '').trim();
        if (!prompt) return;

        try {
            const completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            const aiReply = completion.data.choices[0].message.content;
            await sock.sendMessage(msg.key.remoteJid, { text: aiReply });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Error getting AI response.' });
            console.error(err);
        }
    }
});

sock.ev.on('creds.update', saveState);

}

connectToWhatsApp();

