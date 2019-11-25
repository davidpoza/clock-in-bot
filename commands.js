const schedule = require('node-schedule');
const moment = require('moment-timezone');
const functions = require('./functions');



module.exports.initJobsCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  globalTimer=schedule.scheduleJob('0 0 0 * * *', () => {
    if (isWorkday(moment.tz(process.env.MOMENT_TZ), daysOff, holidays)) {
      const clockInHour=moment.tz(`${randomHour(process.env.MIN_START_HOUR, process.env.MAX_START_HOUR)} ${moment.tz(process.env.MOMENT_TZ, process.env.MOMENT_TZ).format('DD/MM/YYYY')}`, 'HH:mm DD/MM/YYYY');
      const workingTimeDurationInMins=randomNumber(minWorkingTimeDuration, maxWorkingTimeDuration);
      const clockOutHour=moment.tz(clockInHour, process.env.MOMENT_TZ).add(workingTimeDurationInMins, 'minutes');
      bot.telegram.sendMessage(chatId, `I\'m going to start work at: ${clockInHour.format("HH:mm")}`);
      bot.telegram.sendMessage(chatId, `I\'m going to finish work at: ${clockOutHour.format("HH:mm")}`);
      clockInTimer=schedule.scheduleJob(clockInHour.toDate(), () => {
        clockInCommand(ctx);
      });
      clockOutTimer=schedule.scheduleJob(clockOutHour.toDate(), () => {
        clockOutCommand(ctx);
      });
    }
  });
};

module.exports.clockInCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  functions.isFromMe(ctx, () => {
    functions.login()
      .then((res) => {
        const jsessionid=functions.parseCookie(res.headers.raw()['set-cookie']);
        return functions.clockInOut(jsessionid, process.env.START_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-in my friend.👍');
        lastClockIn=moment.tz(process.env.MOMENT_TZ);
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-in: ', err);
      });
  });
}

module.exports.clockOutCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  functions.isFromMe(ctx, () => {
    functions.login()
      .then((res) => {
        const jsessionid = functions.parseCookie(res.headers.raw()['set-cookie']);
        return functions.clockInOut(jsessionid, process.env.END_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-out!!. What such a hard working day👏🏼.');
        lastClockOut=moment.tz(process.env.MOMENT_TZ);
        lastClockIn=undefined;
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-out: ', err);
      });
  });
}