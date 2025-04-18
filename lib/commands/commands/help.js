module.exports = async (sock, jid) => {
  const helpText = `
*Sesmo Bot Commands:*
- !help — Show this help menu
- !ai <prompt> — Chat with AI
- !status — Check if bot is online
  `;
  await sock.sendMessage(jid, { text: helpText });
};
