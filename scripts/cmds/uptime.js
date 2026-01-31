module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "1.0",
    author: "〲T A N J I L ツ",
    role: 0,
    shortDescription: {
      en: "Displays the uptime of the bot."
    },
    longDescription: {
      en: "Displays the amount of time that the bot has been running for."
    },
    category: "System",
    guide: {
      en: "Use {p}uptime to display the uptime of the bot."
    }
  },
  onStart: async function ({ api, event, args }) {
    const uptime = process.uptime();
    const seconds = Math.floor(uptime % 60);
    const minutes = Math.floor((uptime / 60) % 60);
    const hours = Math.floor((uptime / (60 * 60)) % 24);
    const days = Math.floor(uptime / (60 * 60 * 24));

    const uptimeString = `
╭──• ᴛɪᴍᴇʀ ꜱᴛᴀʀᴛᴇᴅ •──╮
│
│   😴 ᴀᴍᴀʀ ᴛɪᴍᴇ ᴅᴇᴋʜᴇ ᴋɪ ᴋᴏʀʙɪ?
│
├─────────────
│ ⏳ ᴛɪᴍᴇ ʟᴇꜰᴛ:
│
│   • ${days} ᴅᴀʏꜱ
│   • ${hours} ʜᴏᴜʀꜱ
│   • ${minutes} ᴍɪɴᴜᴛᴇꜱ
│   • ${seconds} ꜱᴇᴄᴏɴᴅꜱ
│
╰─────────────╯
          ꜱᴛᴀʏ ꜰᴏᴄᴜꜱᴇᴅ, ᴅᴏɴ'ᴛ ᴡᴀꜱᴛᴇ ɪᴛ...
`;

    api.sendMessage(uptimeString, event.threadID);
  }
};
