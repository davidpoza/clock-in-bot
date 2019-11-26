require('dotenv').config();
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const isEmpty = require('lodash.isempty');
const functions = require('./functions.js');


module.exports.initJobsCommand=(ctx, bot, globalTimer, clockInTimer, clockOutTimer, daysOff, holidays) => {
  if (isEmpty(globalTimer)) {
    ctx.reply('Setting main and secondary jobs...');
    globalTimer = Object.assign(globalTimer, schedule.scheduleJob('0 0 0 * * *', () => {
      //in this case we are programming next day during night
      functions.setJobs(ctx, bot, clockInTimer, clockOutTimer, daysOff, holidays);
    }));
  } else {
    ctx.reply('Force resetting secondary jobs now...');
    functions.setJobs(ctx, bot, clockInTimer, clockOutTimer, daysOff, holidays);
  }
};

module.exports.clockInCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  functions.isFromMe(ctx, () => {
    functions.loginRequest()
      .then((res) => {
        const jsessionid=functions.parseCookie(res.headers.raw()['set-cookie']);
        return resolve();
        return functions.clockInOutRequest(jsessionid, process.env.START_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-in my friend.👍');
        lastClockIn = moment.tz(process.env.MOMENT_TZ);
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-in: ', err);
      });
  });
}

module.exports.clockOutCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  functions.isFromMe(ctx, () => {
    functions.loginRequest()
      .then((res) => {
        const jsessionid = functions.parseCookie(res.headers.raw()['set-cookie']);
        return resolve();
        return functions.clockInOutRequest(jsessionid, process.env.END_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-out!!. What such a hard working day👏🏼.');
        lastClockOut = moment.tz(process.env.MOMENT_TZ);
        lastClockIn = undefined;
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-out: ', err);
      });
  });
}