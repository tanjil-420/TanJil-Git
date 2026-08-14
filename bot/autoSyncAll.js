const fs = require("fs-extra");
const path = require("path");
const { log } = global.utils;

async function autoSyncAll(globalData) {
    try {
        log.info("AUTO SYNC", "Starting automatic sync process...");
        

        let prefixRaw = await globalData.get("prefixData");
        if (!prefixRaw) {
            await globalData.set("prefixData", { data: {} });
            prefixRaw = { data: {} };
        }
        const prefixData = prefixRaw.data;

        for (const [cmdName, usePrefixValue] of Object.entries(prefixData)) {
            const cmd = global.GoatBot.commands.get(cmdName);
            if (!cmd) continue;
            let filePath;
            try {
                filePath = require.resolve(cmd.filePath || cmd.config.path || path.join(__dirname, "..", "scripts", "cmds", `${cmd.config.name}.js`));
            } catch (err) {
                continue;
            }
            let content = await fs.readFile(filePath, "utf8");
            const usePrefixStr = usePrefixValue ? "true" : "false";
            if (!content.includes(`usePrefix: ${usePrefixStr}`)) {
                if (content.match(/usePrefix\s*:\s*(true|false)/)) {
                    content = content.replace(/usePrefix\s*:\s*(true|false)/, `usePrefix: ${usePrefixStr}`);
                } else {
                    content = content.replace(/config\s*:\s*{/, `config: {\n    usePrefix: ${usePrefixStr},`);
                }
                await fs.writeFile(filePath, content, "utf8");
                delete require.cache[filePath];
                const newCmd = require(filePath);
                global.GoatBot.commands.set(newCmd.config.name, newCmd);
                
                for (const [alias, cName] of global.GoatBot.aliases.entries()) {
                    if (cName === newCmd.config.name) global.GoatBot.aliases.delete(alias);
                }
                if (Array.isArray(newCmd.config.aliases)) {
                    for (const alias of newCmd.config.aliases) {
                        global.GoatBot.aliases.set(alias, newCmd.config.name);
                    }
                }
            }
        }

        let balanceRaw;
        try {
            balanceRaw = await globalData.get("balanceData");
        } catch (err) {
            await globalData.create("balanceData", {
                data: { 
                    data: {},
                    bypassUsers: [],
                    bypassThreads: [],
                    globalBypass: false,
                    threads: {},
                    globalEnabled: true,
                    threadEnabled: {}
                }
            });
            balanceRaw = { 
                data: {},
                bypassUsers: [],
                bypassThreads: [],
                globalBypass: false,
                threads: {},
                globalEnabled: true,
                threadEnabled: {}
            };
        }
        
        if (!balanceRaw) {
            balanceRaw = { 
                data: {},
                bypassUsers: [],
                bypassThreads: [],
                globalBypass: false,
                threads: {},
                globalEnabled: true,
                threadEnabled: {}
            };
        }
        const balanceData = (balanceRaw && balanceRaw.data) ? balanceRaw.data : {};

        for (const [cmdName, requiredMoneyValue] of Object.entries(balanceData)) {
            const cmd = global.GoatBot.commands.get(cmdName);
            if (!cmd) continue;
            
            let filePath;
            try {
                filePath = require.resolve(cmd.filePath || cmd.config.path || path.join(__dirname, "..", "scripts", "cmds", `${cmd.config.name}.js`));
            } catch (err) {
                continue;
            }
            
            let content = await fs.readFile(filePath, "utf8");
            const requiredMoneyStr = requiredMoneyValue === false ? "0" : requiredMoneyValue.toString();
            
            if (!content.includes(`requiredMoney: ${requiredMoneyStr}`)) {
                if (content.match(/requiredMoney\s*:\s*(\d+|false)/)) {
                    content = content.replace(/requiredMoney\s*:\s*(\d+|false)/, `requiredMoney: ${requiredMoneyStr}`);
                } else {
                    content = content.replace(
                        /name\s*:\s*["']([^"']+)["']/,
                        `name: "$1",\n    requiredMoney: ${requiredMoneyStr}`
                    );
                }
                await fs.writeFile(filePath, content, "utf8");
                delete require.cache[filePath];
                const newCmd = require(filePath);
                global.GoatBot.commands.set(newCmd.config.name, newCmd);
                
                for (const [alias, cName] of global.GoatBot.aliases.entries()) {
                    if (cName === newCmd.config.name) global.GoatBot.aliases.delete(alias);
                }
                if (Array.isArray(newCmd.config.aliases)) {
                    for (const alias of newCmd.config.aliases) {
                        global.GoatBot.aliases.set(alias, newCmd.config.name);
                    }
                }
            }
        }


        let premiumRaw = await globalData.get("premiumData");
        if (!premiumRaw) {
            await globalData.set("premiumData", { data: {} });
            premiumRaw = { data: {} };
        }
        const premiumData = premiumRaw.data;

        for (const [cmdName, isPremiumValue] of Object.entries(premiumData)) {
            const cmd = global.GoatBot.commands.get(cmdName);
            if (!cmd) continue;
            let filePath;
            try {
                filePath = require.resolve(cmd.filePath || cmd.config.path || path.join(__dirname, "..", "scripts", "cmds", `${cmd.config.name}.js`));
            } catch (err) {
                continue;
            }
            let content = await fs.readFile(filePath, "utf8");
            const isPremiumStr = isPremiumValue ? "true" : "false";
            if (!content.includes(`isPremium: ${isPremiumStr}`)) {
                if (content.match(/isPremium\s*:\s*(true|false)/)) {
                    content = content.replace(/isPremium\s*:\s*(true|false)/, `isPremium: ${isPremiumStr}`);
                } else {
                    content = content.replace(/config\s*:\s*{/, `config: {\n    isPremium: ${isPremiumStr},`);
                }
                await fs.writeFile(filePath, content, "utf8");
                delete require.cache[filePath];
                const newCmd = require(filePath);
                global.GoatBot.commands.set(newCmd.config.name, newCmd);
                
                for (const [alias, cName] of global.GoatBot.aliases.entries()) {
                    if (cName === newCmd.config.name) global.GoatBot.aliases.delete(alias);
                }
                if (Array.isArray(newCmd.config.aliases)) {
                    for (const alias of newCmd.config.aliases) {
                        global.GoatBot.aliases.set(alias, newCmd.config.name);
                    }
                }
            }
        }


        
        const userConfigKey = "whiteListMode";
        const userNotiKey = "whiteListModeNoti";

        let userWhiteListConfigData = await globalData.get(userConfigKey);
        if (!userWhiteListConfigData) {
            await globalData.create(userConfigKey, {
                data: {
                    enable: global.GoatBot.config.whiteListMode?.enable || false,
                    whiteListIds: global.GoatBot.config.whiteListMode?.whiteListIds || []
                }
            });
            userWhiteListConfigData = await globalData.get(userConfigKey);
        }

        let userNotiConfigData = await globalData.get(userNotiKey);
        if (!userNotiConfigData) {
            await globalData.create(userNotiKey, {
                data: !global.GoatBot.config.hideNotiMessage?.whiteListMode || true
            });
            userNotiConfigData = await globalData.get(userNotiKey);
        }

        const userWhiteListConfig = userWhiteListConfigData.data;

        const threadConfigKey = "whiteListModeThread";
        const threadNotiKey = "whiteListModeThreadNoti";

        let threadConfigData = await globalData.get(threadConfigKey);
        if (!threadConfigData) {
            await globalData.create(threadConfigKey, {
                data: {
                    enable: false,
                    whiteListThreadIds: []
                }
            });
            threadConfigData = await globalData.get(threadConfigKey);
        }

        let threadNotiConfigData = await globalData.get(threadNotiKey);
        if (!threadNotiConfigData) {
            await globalData.create(threadNotiKey, { data: true });
            threadNotiConfigData = await globalData.get(threadNotiKey);
        }

        const threadConfig = threadConfigData.data;

        const mergedUserIds = Array.from(new Set([
            ...(global.GoatBot.config.whiteListMode?.whiteListIds || []),
            ...(userWhiteListConfig.whiteListIds || [])
        ]));
        const mergedThreadIds = Array.from(new Set([
            ...(global.GoatBot.config.whiteListModeThread?.whiteListThreadIds || []),
            ...(threadConfig.whiteListThreadIds || [])
        ]));

        userWhiteListConfig.enable = global.GoatBot.config.whiteListMode?.enable ?? userWhiteListConfig.enable;
        userWhiteListConfig.whiteListIds = mergedUserIds;

        threadConfig.enable = global.GoatBot.config.whiteListModeThread?.enable ?? threadConfig.enable;
        threadConfig.whiteListThreadIds = mergedThreadIds;

        await globalData.set(userConfigKey, { data: userWhiteListConfig });
        await globalData.set(threadConfigKey, { data: threadConfig });
        await globalData.set(userNotiKey, { data: !global.GoatBot.config.hideNotiMessage?.whiteListMode || true });
        await globalData.set(threadNotiKey, { data: threadNotiConfigData.data });

        global.GoatBot.config.whiteListMode = userWhiteListConfig;
        global.GoatBot.config.whiteListModeThread = threadConfig;
        global.GoatBot.config.hideNotiMessage = global.GoatBot.config.hideNotiMessage || {};
        global.GoatBot.config.hideNotiMessage.whiteListMode = !userNotiConfigData.data;

        const devPath = path.join(process.cwd(), "config.dev.json");
        const mainPath = path.join(process.cwd(), "config.json");

        const configPath = fs.existsSync(devPath)
            ? devPath
            : fs.existsSync(mainPath)
            ? mainPath
            : devPath;

        try {
            await fs.writeFile(configPath, JSON.stringify(global.GoatBot.config, null, 2), "utf8");
            log.info("AUTO SYNC", "Synced both user and thread whitelist configurations");
        } catch (err) {
            log.error("AUTO SYNC", "Failed to sync whitelist config file:", err);
        }

        const adminKey = "adminBot";
        const operatorKey = "operatorBot";
        const mainAdminsKey = "mainAdmins";
        const vipKey = "vipUser";

        let adminConfigData = await globalData.get(adminKey);
        if (!adminConfigData) {
            await globalData.create(adminKey, { data: global.GoatBot.config.adminBot || [] });
            adminConfigData = await globalData.get(adminKey);
        }

        let operatorConfigData = await globalData.get(operatorKey);
        if (!operatorConfigData) {
            await globalData.create(operatorKey, { data: global.GoatBot.config.operatorBot || [] });
            operatorConfigData = await globalData.get(operatorKey);
        }

        let mainAdminsConfigData = await globalData.get(mainAdminsKey);
        if (!mainAdminsConfigData) {
            await globalData.create(mainAdminsKey, { data: global.GoatBot.config.main_admins || [] });
            mainAdminsConfigData = await globalData.get(mainAdminsKey);
        }

        let vipConfigData = await globalData.get(vipKey);
        if (!vipConfigData) {
            await globalData.create(vipKey, { data: global.GoatBot.config.vipUser || [] });
            vipConfigData = await globalData.get(vipKey);
        }

        const adminConfig = adminConfigData.data;
        const operatorConfig = operatorConfigData.data;
        const mainAdminsConfig = mainAdminsConfigData.data;
        const vipConfig = vipConfigData.data;

        const adminSet = new Set([...adminConfig, ...(global.GoatBot.config.adminBot || [])]);
        const operatorSet = new Set([...operatorConfig, ...(global.GoatBot.config.operatorBot || [])]);
        const mainAdminSet = new Set([...mainAdminsConfig, ...(global.GoatBot.config.main_admins || [])]);
        const vipSet = new Set([...vipConfig, ...(global.GoatBot.config.vipUser || [])]);

        const finalAdmins = [...adminSet];
        const finalOperators = [...operatorSet];
        const finalMainAdmins = [...mainAdminSet];
        const finalVips = [...vipSet];

        await globalData.set(adminKey, { data: finalAdmins });
        await globalData.set(operatorKey, { data: finalOperators });
        await globalData.set(mainAdminsKey, { data: finalMainAdmins });
        await globalData.set(vipKey, { data: finalVips });

        global.GoatBot.config.adminBot = finalAdmins;
        global.GoatBot.config.operatorBot = finalOperators;
        global.GoatBot.config.main_admins = finalMainAdmins;
        global.GoatBot.config.vipUser = finalVips;

        const finalConfigPath = fs.existsSync(devPath)
            ? devPath
            : fs.existsSync(mainPath)
            ? mainPath
            : devPath;

        try {
            await fs.writeFile(finalConfigPath, JSON.stringify(global.GoatBot.config, null, 2), "utf8");
        } catch (err) {
            log.error("AUTO SYNC", "Failed to write final config file:", err);
        }
        
        log.success("AUTO SYNC", "✅ All configurations synced successfully!");
        return true;
    } catch (error) {
        log.error("AUTO SYNC", `Error during automatic sync: ${error.message}`);
        return false;
    }
}

module.exports = autoSyncAll;