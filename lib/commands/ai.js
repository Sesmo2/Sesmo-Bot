const { Configuration, OpenAIApi } = require("openai");
const config = require('../config');

const openai = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));

module.exports = async (sock, jid, text) => {
  const prompt = text.replace('!ai', '').trim();
  if (!prompt) return sock.sendMessage(jid, { text: 'Please provide a prompt after !ai' });

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const reply = response.data.choices[0].message.content;
    await sock.sendMessage(jid, { text: reply });
  } catch (err) {
    await sock.sendMessage(jid, { text: 'Error fetching AI response' });
    console.error(err);
  }
};
