
require('dotenv').config();
const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram')
const schedule = require('node-schedule');
const moment = require('moment');

isFromMe = (ctx, fn, fn_anonymous) => {
  ctx.update.message.from.username === 'davidpoza' ? fn() : fn_anonymous();
};

const bot = new Telegraf(process.env.BOT_TOKEN);
//const telegram = new Telegram(process.env.BOT_TOKEN)
let j;
bot.start((ctx) => ctx.reply('hola!'));
bot.command('init_timer', (ctx) => {
  isFromMe(ctx, () => {
    let date = new moment().add(1, 'minutes').toDate();
    j = schedule.scheduleJob(date, () => {
      console.log('ha pasado un minuto');
      ctx.reply('Ya ha pasado un minuto');
    });
    ctx.reply('Te avisaré en un minuto');
  }, () => {
    ctx.reply('No te conozco');
  });

});

bot.startPolling();

bot.use(/*Telegraf.log()*/);