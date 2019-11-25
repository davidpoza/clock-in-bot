
require('dotenv').config();
const Telegraf = require('telegraf');
const moment = require('moment-timezone');
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
let globalTimer;
let clockInTimer;
let clockOutTimer;
let chatId;
let lastClockIn;
let lastClockOut;
const minWorkingTimeDuration=process.env.MIN_WORKINGDAY_DURATION*60; //in minutes
const maxWorkingTimeDuration=process.env.MAX_WORKINGDAY_DURATION*60; //in minutes

bot.start((ctx) => {
  functions.isFromMe(ctx, () => {
    ctx.reply(`Welcome ${process.env.TELEGRAM_USERNAME}!`);
    ctx.reply('Bot initialized!');
    ctx.reply('Setting jobs...');
    chatId=functions.getChatId(ctx);
    commands.initJobsCommand(ctx);
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
  if (!chatId) {
    ctx.reply('Nothing found... Try /start command.');
  } else  {
    if (lastClockIn && !lastClockOut) {
      bot.telegram.sendMessage(chatId, 'I\'m working since ' + lastClockIn.format('DD/MM/YYYY HH:mm'));
    } else if (!lastClockIn && lastClockOut) {
      bot.telegram.sendMessage(chatId, 'I finished work at ' + lastClockOut.format('DD/MM/YYYY HH:mm'));
    } else if (!lastClockIn && !clockInTimer && !clockOutTimer) {
      bot.telegram.sendMessage(chatId, 'I\'m resting. Today\'s my day off.');
    } else if (clockInTimer && clockInTimer.nextInvocation()) {
      bot.telegram.sendMessage(chatId, 'I\'m going to start to work at ' + moment.tz(clockInTimer.nextInvocation(), process.env.MOMENT_TZ).format('DD/MM/YYYY HH:mm'));
    } else if (clockOutTimer && clockOutTimer.nextInvocation()) {
      bot.telegram.sendMessage(chatId, 'I\'m going to finish work at ' + moment.tz(clockOutTimer.nextInvocation(), process.env.MOMENT_TZ).format('DD/MM/YYYY HH:mm'));
    }
  }
});


bot.command('holidays', (ctx) => {
  functions.isFromMe(ctx, () => {
    ctx.reply('Your holdays are:');
    ctx.reply(holidays.join('\n'));
    ctx.reply('and:');
    ctx.reply(daysOff.join('\n'));
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
});

bot.startPolling();
bot.use(/*Telegraf.log()*/);
