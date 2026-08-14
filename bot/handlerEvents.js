const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];
// const { config } = global.GoatBot;
// const { utils } = global;

function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
  const ok = global.GoatBot.config || {};
  const adminBot = ok.adminBot || [];
  const nazrul = ok.nazrul || [];
 
  let premiumUsers = [];
  if (Array.isArray(ok.premium)) {
    premiumUsers = ok.premium;
  } else if (ok.premium && ok.premium.users && Array.isArray(ok.premium.users)) {
    premiumUsers = ok.premium.users;
  }
  
  const premium = [...premiumUsers, ...adminBot];
  const adminBox = threadData ? [...(threadData.adminIDs || []), ...adminBot] : [...adminBot];

  if (!senderID) return 0;

 
  return nazrul.includes(senderID) ? 4 :
         premium.includes(senderID) ? 3 :
         adminBot.includes(senderID) ? 2 :
         adminBox.includes(senderID) ? 1 : 0;
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
else if (type == "onlyNazrul")
    return utils.getText({ lang, head: "handlerEvents" }, "onlyNazrul");
        else if (type == "onlyPremium")
    return utils.getText({ lang, head: "handlerEvents" }, "onlyPremium");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text
                .replace(/\{(?:p|prefix)\}/g, prefix)
                .replace(/\{(?:n|name)\}/g, commandName)
                .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) {
                roleConfig = {
                        onStart: command.config.role
                };
        }
        else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.onStart)
                        command.config.role.onStart = 0;
                roleConfig = command.config.role;
        }
        else {
                roleConfig = {
                        onStart: 0
                };
        }

        if (isGroup)
                roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

        for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
                if (roleConfig[key] == undefined)
                        roleConfig[key] = roleConfig.onStart;
        }

        return roleConfig;
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
        const config = global.GoatBot.config;
        const { adminBot, hideNotiMessage } = config;

        if (adminBot.includes(senderID)) return false;

        const infoBannedUser = userData.banned;
        if (infoBannedUser.status == true) {
                const { reason, date } = infoBannedUser;
                if (hideNotiMessage.userBanned == false)
                        message.reply(getText("userBanned", reason, date, senderID, lang));
                return true;
        }

        if (
                config.adminOnly.enable == true
                && !config.adminOnly.ignoreCommand.includes(commandName)
        ) {
      
                return true;
        }

        if (isGroup == true) {
                if (
                        threadData.data.onlyAdminBox === true
                        && !threadData.adminIDs.includes(senderID)
                        && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)
                ) {
                        return true;
                }

                const infoBannedThread = threadData.banned;
                if (infoBannedThread.status == true) {
                        const { reason, date } = infoBannedThread;
                        if (hideNotiMessage.threadBanned == false)
                                message.reply(getText("threadBanned", reason, date, threadID, lang));
                        return true;
                }
        }

        return false;
}


function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandType = command.config.countDown ? "command" : "command event";
        const commandName = command.config.name;
        let customLang = {};
        let getText2 = () => { };
        if (fs.existsSync(pathCustomLang))
                customLang = require(pathCustomLang)[commandName]?.text || {};
        if (command.langs || customLang || {}) {
                getText2 = function (key, ...args) {
                        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
                        lang = replaceShortcutInLang(lang, prefix, commandName);
                        for (let i = args.length - 1; i >= 0; i--)
                                lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                        return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
                };
        }
        return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
        return async function (event, message) {

                const { utils, client, GoatBot } = global;
                const { getPrefix, removeHomeDir, log, getTime } = utils;
                const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
                const { autoRefreshThreadInfoFirstTime } = config.database;
                let { hideNotiMessage = {} } = config;

                const { body, messageID, threadID, isGroup } = event;

                if (!threadID)
                        return;

                const senderID = event.userID || event.senderID || event.author;

                let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
                let userData = global.db.allUserData.find(u => u.userID == senderID);

                if (!userData && !isNaN(senderID))
                        userData = await usersData.create(senderID);

                if (!threadData && !isNaN(threadID)) {
                        if (global.temp.createThreadDataError.includes(threadID))
                                return;
                        threadData = await threadsData.create(threadID);
                        global.db.receivedTheFirstMessage[threadID] = true;
                }
                else {
                        if (
                                autoRefreshThreadInfoFirstTime === true
                                && !global.db.receivedTheFirstMessage[threadID]
                        ) {
                                global.db.receivedTheFirstMessage[threadID] = true;
                                await threadsData.refreshInfo(threadID);
                        }
                }

                if (typeof threadData.settings.hideNotiMessage == "object")
                        hideNotiMessage = threadData.settings.hideNotiMessage;

                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const parameters = {
                        api, usersData, threadsData, message, event,
                        userModel, threadModel, prefix, dashBoardModel,
                        globalModel, dashBoardData, globalData, envCommands,
                        envEvents, envGlobal, role,
                        removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
                                        throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
                                for (let i = 0; i < arguments.length; i++)
                                        if (typeof arguments[i] != "string")
                                                throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

                                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                        }
                };
                const langCode = threadData.data.lang || config.language || "en";

                function createMessageSyntaxError(commandName) {
                        message.SyntaxError = async function () {
                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
                        };
                }

                /*
                        +-----------------------------------------------+
                        |                                                        WHEN CALL COMMAND                                                              |
                        +-----------------------------------------------+
                */
                let isUserCallCommand = false;
                async function onStart() {
  // —————————————— CHECK USE BOT —————————————— //
  if (!body)
    return;

  const dateNow = Date.now();
  let args, commandName, command;
  let isAdminPrefix = false;
  const adminPrefix = config.adminPrefix || "!";
  const adminBot = config.adminBot || [];
  
  if (body.startsWith(adminPrefix)) {
    // Check if user is an admin
    if (!adminBot.includes(senderID)) {
      return; // Silently ignore non-admin users trying to use admin prefix
    }
    isAdminPrefix = true;
    args = body.slice(adminPrefix.length).trim().split(/ +/);
    commandName = args.shift().toLowerCase();
    command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
  }

  else if (body.startsWith(prefix)) {
    args = body.slice(prefix.length).trim().split(/ +/);
    commandName = args.shift().toLowerCase();
    command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
  } 

  else {
    args = body.trim().split(/ +/);
    commandName = args.shift().toLowerCase();
  
    command = Array.from(GoatBot.commands.values()).find(cmd => 
      (cmd.config.name === commandName || 
       (cmd.config.aliases || []).includes(commandName)) &&
      cmd.config.usePrefix === false
    );
  }

  // ———————— CHECK ALIASES SET BY GROUP ———————— //
  if (!command) {
    const aliasesData = threadData.data.aliases || {};
    for (const cmdName in aliasesData) {
      if (aliasesData[cmdName].includes(commandName)) {
        command = GoatBot.commands.get(cmdName);
        break;
      }
    }
  }

  // ————————————— SET COMMAND NAME ————————————— //
  if (command)
    commandName = command.config.name;
  
  // ——————— FUNCTION REMOVE COMMAND NAME ———————— //
  function removeCommandNameFromBody(body_, prefix_, commandName_) {
    if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
      throw new Error("Please provide body, prefix and commandName to use this function");
    
    for (let i = 0; i < arguments.length; i++)
      if (typeof arguments[i] != "string")
        throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

    const actualPrefix = isAdminPrefix ? adminPrefix : prefix_;
    return body_.replace(new RegExp(`^${actualPrefix}(\\s+|)${commandName_}`, "i"), "").trim();
  }

  // ————— CHECK BANNED OR ONLY ADMIN BOX ————— //
  if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
    return;

  if (!command && (body.startsWith(prefix) || (adminPrefix && body.startsWith(adminPrefix)))) {
    if (!hideNotiMessage.commandNotFound) {
      const usedPrefix = (adminPrefix && body.startsWith(adminPrefix)) ? adminPrefix : prefix;
      return await message.reply(
        commandName ?
          utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound", commandName, usedPrefix) :
          utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound2", usedPrefix)
      );
    }
    return true;
  }

  if (!command && !body.startsWith(prefix) && !(adminPrefix && body.startsWith(adminPrefix))) {
    return;
  }

  // ——————————————— PREMIUM CHECK ——————————————— //
if (command.config?.isPremium === true) {
  const premiumConfig = global.GoatBot.config.premium || {};
  const premiumList = Array.isArray(premiumConfig) ? premiumConfig : (premiumConfig.users || []);
  const isPremiumUser = premiumList.includes(senderID) || userData?.premium?.isPremium === true;

  if (!isPremiumUser) {
    return await message.reply(
      utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPremium", commandName)
    );
  }
                        };


                        // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return; // Ignore this user completely unless protected
};

  // ————————————— CHECK PERMISSION ———————————— //
  const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
  const needRole = roleConfig.onStart;

  if (needRole > role) {
    if (!hideNotiMessage.needRoleToUseCmd) {
      if (needRole == 1)
        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdmin", commandName));
      else if (needRole == 2)
        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2", commandName));
      else if (needRole == 3)
        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyPremium", commandName));
      else if (needRole == 4)
        return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyNazrul", commandName));
    }
    return true;
  }

  // ———————————————— countDown ———————————————— //
  if (!client.countDown[commandName])
    client.countDown[commandName] = {};
    
  const timestamps = client.countDown[commandName];
  let getCoolDown = command.config.countDown;
  if ((!getCoolDown && getCoolDown != 0) || isNaN(getCoolDown))
    getCoolDown = 1;
    
  const cooldownCommand = getCoolDown * 1000;
  if (timestamps[senderID]) {
    const expirationTime = timestamps[senderID] + cooldownCommand;
    if (dateNow < expirationTime) {
      return await message.reply(
        utils.getText(
          { lang: langCode, head: "handlerEvents" }, 
          "waitingForCommand", 
          ((expirationTime - dateNow) / 1000).toString().slice(0, 3)
        )
      );
    }
  }

  const exemptCommands = ['balance', 'help', 'register', 'bank', 'daily', 'admin', 'prefix', 'ping', 'setbalance', 'setbal'];
  
  let balanceSettings = null;
  try {
    const raw = await globalData.get("balanceData");
    if (raw) {
      // globalData returns data wrapped in { data: ... }
      balanceSettings = raw.data || raw;
    }
  } catch (err) {
  }
  
  let balanceEnabled = true;
  if (balanceSettings) {
    if (balanceSettings.globalEnabled === false) {
      balanceEnabled = false;
    }
    if (balanceSettings.threadEnabled?.[threadID] !== undefined) {
      balanceEnabled = balanceSettings.threadEnabled[threadID];
    }
  }
  
  let commandCost = 500;
  
  if (balanceSettings?.threads?.[threadID]?.[command.config.name] !== undefined) {
    commandCost = balanceSettings.threads[threadID][command.config.name];
  }
  else if (command.config.requiredMoney !== undefined) {
    commandCost = command.config.requiredMoney;
  }
  else if (balanceSettings?.data?.[command.config.name] !== undefined) {
    commandCost = balanceSettings.data[command.config.name];
  }
  
  const userBypassFromData = userData?.settings?.isBypassed || false;
  const userBypassFromGlobal = balanceSettings?.bypassUsers?.includes(senderID) || false;
  const userHasBypass = userBypassFromData || userBypassFromGlobal;
  const threadBypassFromSettings = threadData?.settings?.isBypassed || false;
  const threadBypassFromGlobal = balanceSettings?.bypassThreads?.includes(threadID) || false;
  const threadHasBypass = threadBypassFromSettings || threadBypassFromGlobal;
  
  const globalBypass = balanceSettings?.globalBypass || false;
  
  const adminBotList = global.GoatBot.config.adminBot || [];
  const premiumList = Array.isArray(global.GoatBot.config.premium) ? global.GoatBot.config.premium : [];
  const isAdminBot = adminBotList.includes(senderID);
  const isPremiumUser = (Array.isArray(premiumList) && premiumList.includes(senderID)) || userData?.premium?.isPremium === true;
  
  const shouldChargeBalance = balanceEnabled &&
                              !exemptCommands.includes(commandName.toLowerCase()) && 
                              commandCost > 0 && 
                              role < 2 &&
                              !userHasBypass &&
                              !threadHasBypass &&
                              !globalBypass &&
                              !isAdminBot &&
                              !isPremiumUser;
  
  if (shouldChargeBalance) {
    const currentUserData = await usersData.get(senderID) || { money: 0 };
    const userBalance = Number(currentUserData.money) || 0;
    
    if (userBalance < commandCost) {
      const needMore = commandCost - userBalance;
      
      return await message.reply(
        `❌ Insufficient Balance!\n\n` +
        `• Your balance: ${userBalance}$\n` +
        `• Cmd cost: ${commandCost}$\n` +
        `• Need More ${needMore}$ to use "${commandName}" !`
      );
    }
  }
  const time = getTime("DD/MM/YYYY HH:mm:ss");
  isUserCallCommand = true;
  
  try {
 
    if (shouldChargeBalance) {
      const currentUserData = await usersData.get(senderID) || { money: 0 };
      const userBalance = Number(currentUserData.money) || 0;
      const newBalance = (userBalance - commandCost).toString();
      
      await usersData.set(senderID, { money: newBalance });
      
      log.info("BALANCE DEDUCT", `${commandName} | ${userData.name} | ${senderID} | -${commandCost}$ | New: ${newBalance}$`);
    }
    
    (async () => {
      const analytics = await globalData.get("analytics", "data", {});
      if (!analytics[commandName])
        analytics[commandName] = 0;
      analytics[commandName]++;
      await globalData.set("analytics", analytics, "data");
    })();

    createMessageSyntaxError(commandName);
    const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
    
    await command.onStart({
      ...parameters,
      args,
      commandName,
      getLang: getText2,
      removeCommandNameFromBody
    });
    
    timestamps[senderID] = dateNow;
    log.info(
      "CALL COMMAND", 
      `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`
    );
  }
  catch (err) {
    log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}`, err);
    return await message.reply(
      utils.getText(
        { lang: langCode, head: "handlerEvents" }, 
        "errorOccurred", 
        time, 
        commandName, 
        removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))
      )
    );
  }
}

                /*
                 +------------------------------------------------+
                 |                    ON CHAT                     |
                 +------------------------------------------------+
                */
                async function onChat() {
                        const allOnChat = GoatBot.onChat || [];
                        const args = body ? body.split(/ +/) : [];
                        for (const key of allOnChat) {
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;

     // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};

                                // —————————————— CHECK PERMISSION —————————————— //
                                const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                                const needRole = roleConfig.onChat;
                                if (needRole > role)
                                        continue;

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.onChat) == "Function") {
                                        const defaultOnChat = command.onChat;
                                        // convert to AsyncFunction
                                        command.onChat = async function () {
                                                return defaultOnChat(...arguments);
                                        };
                                }

                                command.onChat({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("onChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onChat", `An error occurred when calling the command onChat ${commandName}`, err);
                                        });
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON ANY EVENT                 |
                 +------------------------------------------------+
                */
                async function onAnyEvent() {
                        const allOnAnyEvent = GoatBot.onAnyEvent || [];
                        let args = [];

  // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return; 
};

                        if (typeof event.body == "string" && event.body.startsWith(prefix))
                                args = event.body.split(/ +/);

                        for (const key of allOnAnyEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onAnyEvent) == "Function") {
                                        const defaultOnAnyEvent = command.onAnyEvent;
                                        // convert to AsyncFunction
                                        command.onAnyEvent = async function () {
                                                return defaultOnAnyEvent(...arguments);
                                        };
                                }

                                command.onAnyEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onAnyEvent", `${commandName} | ${senderID} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred7", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                  ON FIRST CHAT                 |
                 +------------------------------------------------+
                */
                async function onFirstChat() {
                        const allOnFirstChat = GoatBot.onFirstChat || [];

                        const args = body ? body.split(/ +/) : [];

  // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};

                        for (const itemOnFirstChat of allOnFirstChat) {
                                const { commandName, threadIDsChattedFirstTime } = itemOnFirstChat;
                                if (threadIDsChattedFirstTime.includes(threadID))
                                        continue;
                                const command = GoatBot.commands.get(commandName);
                                if (!command)
                                        continue;

                                itemOnFirstChat.threadIDsChattedFirstTime.push(threadID);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.onFirstChat) == "Function") {
                                        const defaultOnFirstChat = command.onFirstChat;
                                        // convert to AsyncFunction
                                        command.onFirstChat = async function () {
                                                return defaultOnFirstChat(...arguments);
                                        };
                                }

                                command.onFirstChat({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("onFirstChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onFirstChat", `An error occurred when calling the command onFirstChat ${commandName}`, err);
                                        });
                        }
                }


                /* 
                 +------------------------------------------------+
                 |                    ON REPLY                    |
                 +------------------------------------------------+
                */
                async function onReply() {
                        if (!event.messageReply)
                                return;
                        const { onReply } = GoatBot;


 // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};

                        const Reply = onReply.get(event.messageReply.messageID);
                        if (!Reply)
                                return;
                        Reply.delete = () => onReply.delete(messageID);
                        const commandName = Reply.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReply", `Can't find command name to execute this reply!`, Reply);
                        }

                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReply", `Command "${commandName}" not found`, Reply);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReply;
                        if (needRole > role) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReply) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReply", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReply", commandName));
                                }
                                else {
                                        return true;
                                }
                        }

                        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const args = body ? body.split(/ +/) : [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.onReply({
                                        ...parameters,
                                        Reply,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReply", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                        }
                        catch (err) {
                                log.err("onReply", `An error occurred when calling the command onReply ${commandName}`, err);
                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred3", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON REACTION                  |
                 +------------------------------------------------+
                */
                async function onReaction() {
                        const { onReaction } = GoatBot;

 // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};
                        const Reaction = onReaction.get(messageID);
                        if (!Reaction)
                                return;
                        Reaction.delete = () => onReaction.delete(messageID);
                        const commandName = Reaction.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
                        }
                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReaction;
                        if (needRole > role) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReaction", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReaction", commandName));
                                }
                                else {
                                        return true;
                                }
                        }
                        // —————————————————————————————————————————————— //

                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const args = [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.onReaction({
                                        ...parameters,
                                        Reaction,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReaction", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${event.reaction}`);
                        }
                        catch (err) {
                                log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                        }
                }


                /*
                 +------------------------------------------------+
                 |                 EVENT COMMAND                  |
                 +------------------------------------------------+
                */
                async function handlerEvent() {
                        const { author } = event;
                        const allEventCommand = GoatBot.eventCommands.entries();


 // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};

                        for (const [key] of allEventCommand) {
                                const getEvent = GoatBot.eventCommands.get(key);
                                if (!getEvent)
                                        continue;
                                const commandName = getEvent.config.name;
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                try {
                                        const handler = await getEvent.onStart({
                                                ...parameters,
                                                commandName,
                                                getLang: getText2
                                        });
                                        if (typeof handler == "function") {
                                                await handler();
                                                log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                        }
                                }
                                catch (err) {
                                        log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
                                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred5", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                }
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON EVENT                    |
                 +------------------------------------------------+
                */
                async function onEvent() {
                        const allOnEvent = GoatBot.onEvent || [];
                        const args = [];
                        const { author } = event;


  // ——————————————— SPAM BAN CHECK ——————————————— //
if (userData?.settings?.spamBan === true && userData?.settings?.protect !== true) {
  return;
};

                        for (const key of allOnEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onEvent) == "Function") {
                                        const defaultOnEvent = command.onEvent;
                                        // convert to AsyncFunction
                                        command.onEvent = async function () {
                                                return defaultOnEvent(...arguments);
                                        };
                                }

                                command.onEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onEvent", `${commandName} | ${author} | ${userData.name} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred6", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                    PRESENCE                    |
                 +------------------------------------------------+
                */
                async function presence() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                  READ RECEIPT                  |
                 +------------------------------------------------+
                */
                async function read_receipt() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                               TYP                            |
                 +------------------------------------------------+
                */
                async function typ() {
                        // Your code here
                }

                return {
                        onAnyEvent,
                        onFirstChat,
                        onChat,
                        onStart,
                        onReaction,
                        onReply,
                        onEvent,
                        handlerEvent,
                        presence,
                        read_receipt,
                        typ
                };
        };
};