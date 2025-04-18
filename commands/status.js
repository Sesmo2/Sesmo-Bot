module.exports = async (sock, jid) => {
  await sock.sendMessage(jid, { text: 'Bot is online and running!' });
};
