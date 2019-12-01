
require('dotenv').config();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const calendar = require('telegraf-calendar-telegram');
const commands = require('./commands.js');
const functions = require('./functions.js');

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ holidays: [], daysOff: [] })
  .write();
const bot=new Telegraf(process.env.BOT_TOKEN);
const calProps = {
	startWeekDay: 1,
	weekDayNames: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
	monthNames: [
		'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
		'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
	]
};
const cal = new calendar(bot, calProps);
let chatId;
let previousCommand = "";

bot.start((ctx) => {
  previousCommand = "start";
  functions.isFromMe(ctx, () => {
    if (!chatId) {
      ctx.reply(`Welcome ${process.env.TELEGRAM_USERNAME}!`);
      chatId = functions.getChatId();
    } else {
      ctx.reply(`You are ${process.env.TELEGRAM_USERNAME}... I already know it....`);
    }
    commands.initJobsCommand(ctx, schedule, db);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
});

bot.command('clock_in', (ctx) => {
  previousCommand = "clock_in";
  commands.clockInCommand(ctx);
});

bot.command('clock_out', (ctx) => {
  previousCommand = "clock_out";
  commands.clockOutCommand(ctx);
});

bot.help((ctx) => {
  ctx.reply(`Available commands are:
  * /help
  * /start
  * /status
  * /clock_in
  * /clock_out
  * /holidays
  * /add_holiday (remove if it exists)
  * /add_dayoff (remove if it exists)
  * /tomorrow_not_work
  * /today_not_work
  `);
});

bot.command('status', (ctx) => {
  previousCommand = "status";
  commands.statusCommand(ctx, schedule, db);
});

bot.command('holidays', (ctx) => {
  previousCommand = "holidays";
  commands.holidaysCommand(ctx, db);
});

/**
 * listen for the selected date event, calendar needs it for working.
 * Also receives selected date with following format: YYYY-MM-DD
 */
cal.setDateListener((ctx, date) => {
  if (previousCommand === 'add_holiday') {
    date && functions.insertDeleteDay(ctx, db, date, 'holidays');
  } else if (previousCommand === 'add_dayoff'){
    date && functions.insertDeleteDay(ctx, db, date, 'daysOff');
  }
});

bot.command('add_holiday', (ctx) => {
  previousCommand = "add_holiday";
  commands.addRemoveDateCommand(ctx, cal, 'Select day to be added/removed from your holidays: ');
});

bot.command('add_dayoff', (ctx) => {
  previousCommand = "add_dayoff";
  commands.addRemoveDateCommand(ctx, cal, 'Select day to be added/removed from your daysOff: ');
});

bot.catch((err) => {
	console.log('Error in bot:', err);
});

bot.startPolling();
