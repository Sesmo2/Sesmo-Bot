const aiCommand = require('../commands/ai');
const helpCommand = require('../commands/help');
const statusCommand = require('../commands/status');

module.exports = async (sock, msg, text) => {
  const jid = msg.key.remoteJid;

  if (text === '!help') return helpCommand(sock, jid);
  if (text.startsWith('!ai')) return aiCommand(sock, jid, text);
  if (text === '!status') return statusCommand(sock, jid);
};
