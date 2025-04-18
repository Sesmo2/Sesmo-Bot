module.exports = async (sock, msg, text) => {
  try {
    const command = text.split(' ')[0].substring(1).toLowerCase();

    switch (command) {
      case 'help':
        require('../commands/help')(sock, msg);
        break;
      case 'ai':
        require('../commands/ai')(sock, msg);
        break;
      case 'status':
        require('../commands/status')(sock, msg);
        break;
      default:
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Unknown command. Type !help' });
    }
  } catch (err) {
    console.error('Command error:', err);
    await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Something went wrong!' });
  }
};
