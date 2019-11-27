require('dotenv').config();
const moment = require('moment-timezone');
const isEmpty = require('lodash.isempty');
const functions = require('./functions.js');

/**
 * TODO: transform into pure function
 */
module.exports.initJobsCommand=(ctx, bot, schedule, daysOff, holidays) => {
  if (!schedule.scheduledJobs.globalTimer) {
    ctx.reply('Setting main and secondary jobs...');
    schedule.scheduleJob('globalTimer', '0 0 0 * * *', () => {
      functions.setJobs(ctx, bot, schedule, daysOff, holidays);
    });
  } else {
    ctx.reply('Force resetting secondary jobs now...');
    functions.setJobs(ctx, bot, schedule, daysOff, holidays);
  }
  console.log(schedule)
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
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-out: ', err);
      });
  });
}

module.exports.holidaysCommand=(ctx, holidays, daysOff) => {
  functions.isFromMe(ctx, () => {
    ctx.reply('Your holdays are:');
    ctx.reply(holidays.join('\n'));
    ctx.reply('and:');
    ctx.reply(daysOff.join('\n'));
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

module.exports.statusCommand=(ctx, schedule, daysOff, holidays) => {
  functions.isFromMe(ctx, () => {
    const start = !isEmpty(clockInTimer) ? clockInTimer.nextInvocation() : false;
    const end = !isEmpty(clockOutTimer) ? clockOutTimer.nextInvocation() : false;
    console.log(start, end)
    if (!start && !end) {
      ctx.reply('Bot is not started. Run /start command.');
    } else if (!isWorkday(moment.tz(process.env.MOMENT_TZ), daysOff, holidays)) {
      ctx.reply('I\'m resting. Today\'s my day off.');
    } else {
      // work not started yet
      if (moment.tz(start, process.env.MOMENT_TZ).isAfter(moment.tz(process.env.MOMENT_TZ))) {
        ctx.reply('You hasn\'t started work yet. This will be at ' + moment.tz(start, process.env.MOMENT_TZ).format('DD/MM/YYYY HH:mm'));
      }
    }
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}