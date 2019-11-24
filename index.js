
require('dotenv').config();
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const moment = require('moment');
const get = require('lodash.get');

isFromMe = (ctx, fn, fn_anonymous) => {
  get(ctx, 'update.message.from.username') === 'davidpoza' ? fn() : fn_anonymous && fn_anonymous();
};

getChatId = (ctx) => {
  return get(ctx, 'update.message.chat.id');
}

isWorkday = (date, daysOff, holidays) => {
  let dow = moment(date).isoWeekday(); //1:lunes, 7:domingo
  let formattedDate = moment(date).format('DD/MM/YYYY');
  if (dow === 6 || dow === 7) {
    return false;
  }
  if (daysOff.includes(formattedDate) || holidays.includes(formattedDate))
    return false;
  return true;
}

/* returns hour in format HH:MM between min and max */
randomHour = (min, max) => {
  let min_timestamp = moment(`${min} 01/01/2019`, "HH:mm DD/MM/YYYY").unix();
  let max_timestamp = moment(`${max} 01/01/2019`, "HH:mm DD/MM/YYYY").unix();
  let result_timestamp = Math.floor(Math.random() * (max_timestamp - min_timestamp)) + min_timestamp;
  return (moment(new Date(result_timestamp*1000)).format('HH:mm'));
}

randomNumber = (min, max) => {
  return (Math.floor(Math.random() * (max - min)) + min);
}

initJobs = () => {
  globalTimer = schedule.scheduleJob('0 0 0 * * *', () => {
    if (!isWorkday(moment(), daysOff, holidays)) {
      const clockInHour = moment(`${randomHour(process.env.MIN_START_HOUR, process.env.MAX_START_HOUR)} ${moment().format('DD/MM/YYYY')}`, 'HH:mm DD/MM/YYYY');
      const workingTimeDurationInMins = randomNumber(minWorkingTimeDuration, maxWorkingTimeDuration);
      const clockOutHour = moment(clockInHour).add(workingTimeDurationInMins, 'minutes');
      bot.telegram.sendMessage(chatId, `hora de entrada: ${clockInHour.format("HH:mm")}`);
      bot.telegram.sendMessage(chatId, `hora de salida: ${clockOutHour.format("HH:mm")}`);
      clockInTimer = schedule.scheduleJob(clockInHour.toDate(), () => {

      });
      clockOutTimer = schedule.scheduleJob(clockOutHour.toDate(), () => {

      });
    }
  });
};

const bot = new Telegraf(process.env.BOT_TOKEN);
let daysOff = [
  '26/12/2019',
  '27/12/2019',
  '30/12/2019',
  '02/01/2020',
  '03/01/2020',
];
let holidays = [
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
const minWorkingTimeDuration = process.env.MIN_WORKINGDAY_DURATION*60; //in minutes
const maxWorkingTimeDuration = process.env.MAX_WORKINGDAY_DURATION*60; //in minutes

bot.start((ctx) => {
  isFromMe(ctx, () => {
    ctx.reply('Bot initialized!');
    ctx.reply('Setting jobs...');
    chatId = getChatId(ctx);
    initJobs();
  }, () => {
    ctx.reply("I don't know who you are... I'll ignore you.");
  });
});
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