
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
	weekDayNames: ["L", "M", "M", "G", "V", "S", "D"],
	monthNames: [
		"Ene", "Feb", "Mar", "Abr", "May", "Jun",
		"Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
	]
};
const calDaysOff = new calendar(bot, calProps);
const calHolidays = new calendar(bot, calProps);

let chatId;

bot.start((ctx) => {
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
  commands.clockInCommand(ctx);
});

bot.command('clock_out', (ctx) => {
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
  * /add_holiday
  * /add_dayoff
  * /tomorrow_not_work
  * /today_not_work
  `);
});

bot.command('status', (ctx) => {
  commands.statusCommand(ctx, schedule, db);
});

bot.command('holidays', (ctx) => {
  commands.holidaysCommand(ctx, db);
});

/**
 * listen for the selected date event, calendar needs it for working.
 * Also receives selected date with following format: YYYY-MM-DD
 */
calDaysOff.setDateListener((ctx, date) => {
  functions.insertDay(ctx, db, date, 'daysOff');
});

calHolidays.setDateListener((ctx, date) => {
  functions.insertDay(ctx, db, date, 'holidays');
});

bot.command("add_holiday", (ctx) => {
  commands.addHolidayCommand(ctx, db, calHolidays, 'Select your holiday date: ');
});

bot.command("add_dayoff", (ctx) => {
  commands.addDayOffCommand(ctx, db, calDaysOff, 'Select your day-off ');
});

bot.catch((err) => {
	console.log("Error in bot:", err);
});


bot.startPolling();

