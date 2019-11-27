require('dotenv').config();
const moment = require('moment-timezone');
const functions = require('./functions.js');

/**
 * TODO: transform into pure function
 */
module.exports.initJobsCommand=(ctx, schedule, daysOff, holidays) => {
  if (!schedule.scheduledJobs.globalTimer) {
    ctx.reply('Setting main and secondary jobs...');
    schedule.scheduleJob('globalTimer', '0 0 0 * * *', () => {
      functions.setJobs(ctx, schedule, daysOff, holidays);
    });
  } else {
    ctx.reply('Force resetting secondary jobs now...');
    functions.setJobs(ctx, schedule, daysOff, holidays);
  }
};

module.exports.clockInCommand=(ctx, bot) => {
  const chatId = functions.getChatId(ctx);
  functions.isFromMe(ctx, () => {
    functions.loginRequest()
      .then((res) => {
        const jsessionid=functions.parseCookie(res.headers.raw()['set-cookie']);
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
    // reset jobs
    functions.setJobs(ctx, schedule, daysOff, holidays);
    const { clockInTimer, clockOutTimer } = schedule.scheduledJobs;
    const start = clockInTimer && clockInTimer.nextInvocation();
    const end = clockOutTimer && clockOutTimer.nextInvocation();

    if (!start && !end) {
      ctx.reply('Now i have nothing to do.');
    } else if (!start && end) {
      // currently working
      ctx.reply(`I'm currently working now. I'll clock-out at ${moment.tz(end, process.env.MOMENT_TZ).format('DD/MM/YYYY HH:mm')}`);
    } else if (start && end) {
      // work hasn't started
      ctx.reply(`Work hasn't started yet. This will happen at ${moment.tz(start, process.env.MOMENT_TZ).format('DD/MM/YYYY HH:mm')}`);
    }
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}