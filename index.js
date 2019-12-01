
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
// The string of following date arrays have the DD/MM/YYYY format.
db.defaults({ holidays: [], daysOff: [] })
  .write();
const bot=new Telegraf(process.env.BOT_TOKEN);
const calProps = {
	startWeekDay: 1,
	weekDayNames: ['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'],
	monthNames: [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

/**
 * Calls login a clock-in endpoints
 */
bot.command('clock_in', (ctx) => {
  previousCommand = "clock_in";
  commands.clockInCommand(ctx);
});

/**
 * Calls login a clock-out endpoints
 */
bot.command('clock_out', (ctx) => {
  previousCommand = "clock_out";
  commands.clockOutCommand(ctx);
});

/**
 * Displays a full list of all available bot commands
 */
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
  * /tomorrow_not_work (acts as switch)
  * /today_not_work (acts as switch)
  `);
});

bot.command('status', (ctx) => {
  previousCommand = "status";
  commands.statusCommand(ctx, schedule, db);
});

/**
 * Returns a sorted list of all dates within holidays and daysOff arrays.
 */
bot.command('holidays', (ctx) => {
  previousCommand = "holidays";
  commands.holidaysCommand(ctx, db);
});

/**
 * listen for the date selecting tap event, calendar needs it for working.
 * Also receives selected date with following format: YYYY-MM-DD
 */
cal.setDateListener((ctx, date) => {
  if (previousCommand === 'add_holiday') {
    date && functions.insertDeleteDay(ctx, db, date, 'holidays');
  } else if (previousCommand === 'add_dayoff'){
    date && functions.insertDeleteDay(ctx, db, date, 'daysOff');
  }
});

/**
 * This command works like a switch: First we are asked for a date (using calendar).
 * Afterward it checks if date already exists in holidays array. If it doesn't exist
 * we insert it, but we remove it if does. Finally statusCommand is called to reload the timer jobs,
 * to take new dates into account.
 */
bot.command('add_holiday', (ctx) => {
  previousCommand = "add_holiday";
  commands.addRemoveDateCommand(ctx, cal, 'Select day to be added/removed from your holidays: ');
});

/**
 * This command works like a switch: First we are asked for a date (using calendar).
 * Afterward it checks if date already exists in daysOff array. If it doesn't exist
 * we insert it, but we remove it if does. Finally statusCommand is called to reload the timer jobs,
 * to take new dates into account.
 */
bot.command('add_dayoff', (ctx) => {
  previousCommand = "add_dayoff";
  commands.addRemoveDateCommand(ctx, cal, 'Select day to be added/removed from your daysOff: ');
});

/**
 * This command works like a switch: by adding today date to daysOff array, and then calling
 * statusCommand to reload the timer jobs, to take new dates into account.
 * Nevertheless if today date already exists in array, then we remove it.
 */
bot.command('today_not_work', (ctx) => {
  previousCommand = "today_not_work";
  commands.todayNotWorkCommand(ctx, schedule, db);
});

/**
 * This command works by adding tomorrow date to daysOff array, and then calling
 * statusCommand to reload the timer jobs, to take new dates into account.
 * Nevertheless if tomorrow date already exists in array, then we remove it.
 */
bot.command('tomorrow_not_work', (ctx) => {
  previousCommand = "tomorrow_not_work";
  commands.tomorrowNotWorkCommand(ctx, schedule, db);
});

bot.catch((err) => {
	console.log('Error in bot:', err);
});

bot.startPolling();
