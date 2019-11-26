
require('dotenv').config();
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const commands = require('./commands.js');
const functions = require('./functions.js');


const bot=new Telegraf(process.env.BOT_TOKEN);
let daysOff=[
  '26/12/2019',
  '27/12/2019',
  '30/12/2019',
  '02/01/2020',
  '03/01/2020',
];
let holidays=[
  '06/12/2019',
  '09/12/2019',
  '25/12/2019',
  '01/01/2020',
  '06/01/2020',
  '09/04/2020',
  '10/04/2020',
  '01/05/2020',
  '15/08/2020',
  '12/10/2020',
  '02/11/2020',
  '09/11/2020',
  '07/12/2020',
  '08/12/2020',
  '25/12/2020',
];
let globalTimer = {};
let clockInTimer = {};
let clockOutTimer = {};
let chatId;

bot.start((ctx) => {
  functions.isFromMe(ctx, () => {
    if (!chatId) {
      ctx.reply(`Welcome ${process.env.TELEGRAM_USERNAME}!`);
      chatId = functions.getChatId();
    } else {
      ctx.reply(`You are ${process.env.TELEGRAM_USERNAME}... I already know it....`);
    }
    commands.initJobsCommand(ctx, bot, schedule, globalTimer, clockInTimer, clockOutTimer, daysOff, holidays);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
});

bot.command('clock_in', (ctx) => {
  commands.clockInCommand(ctx, bot);
});

bot.command('clock_out', (ctx) => {
  commands.clockOutCommand(ctx, bot);
});

bot.help((ctx) => {
  ctx.reply(`Available commands are:
  * /help
  * /start
  * /status
  * /clock_in
  * /clock_out
  * /holidays
  * /tomorrow_not_work
  * /today_not_work
  `);
});

bot.command('status', (ctx) => {
  commands.statusCommand(ctx, schedule, clockInTimer, clockOutTimer, daysOff, holidays);
});

bot.command('holidays', (ctx) => {
  commands.holidaysCommand(ctx, holidays, daysOff);
});

bot.startPolling();
bot.use(/*Telegraf.log()*/);
