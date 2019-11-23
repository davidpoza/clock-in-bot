
require('dotenv').config();
const Telegraf = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => ctx.reply('Welcome'));

bot.startPolling();

bot.use(Telegraf.log());

bot.command('start', ({ reply }) => {
    reply('Olá');
});