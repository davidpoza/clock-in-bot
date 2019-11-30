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
      functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), daysOff, holidays);
    });
  } else {
    ctx.reply('Force resetting secondary jobs now...');
    functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), daysOff, holidays);
  }
};

module.exports.clockInCommand=(ctx) => {
  functions.isFromMe(ctx, () => {
    Promise.resolve("OK")
    //functions.loginRequest()
      .then((res) => {
        const jsessionid=functions.parseCookie(res.headers.raw()['set-cookie']);
        //return functions.clockInOutRequest(jsessionid, process.env.START_WORK_ENDPOINT);
        return Promise.resolve("OK");
      })
      .then((res) => {
        ctx.reply('I\'ve just clock-in my friend.👍');
      })
      .catch((err) => {
        ctx.reply('Error ocurred on clock-in: ', err);
      });
  });
}

module.exports.clockOutCommand=(ctx) => {
  functions.isFromMe(ctx, () => {
      Promise.resolve("OK")
    //functions.loginRequest()
      .then((res) => {
        const jsessionid = functions.parseCookie(res.headers.raw()['set-cookie']);
        //return functions.clockInOutRequest(jsessionid, process.env.END_WORK_ENDPOINT);
        return Promise.resolve("OK");
      })
      .then((res) => {
        ctx.reply('I\'ve just clock-out!!. What such a hard working day👏🏼.');
      })
      .catch((err) => {
        ctx.reply('Error ocurred on clock-out: ', err);
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

module.exports.addHolidayCommand=(ctx, holidays, cal, msg) => {
  functions.isFromMe(ctx, () => {
    functions.launchCalendar(ctx, cal, msg);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

module.exports.statusCommand=(ctx, schedule, daysOff, holidays) => {
  functions.isFromMe(ctx, () => {
    // reset jobs
    functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), daysOff, holidays);
    const { clockInTimer, clockOutTimer } = schedule.scheduledJobs;
    /**
     * we also have to check nextInvocation since a terminated job is not deleted from list
     */
    const start = clockInTimer && clockInTimer.nextInvocation();
    const end = clockOutTimer && clockOutTimer.nextInvocation();
    if (start === null && end) {
      ctx.reply(`I'm at work right now but it ends at ${moment.tz(new Date(end), process.env.MOMENT_TZ).format("HH:mm")}`);
    }
    if (!start && !end) {
      //we try with tomorrow
      functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ).add(1, 'days'), daysOff, holidays);
      const { clockInTimer, clockOutTimer } = schedule.scheduledJobs;
      const start = clockInTimer && clockInTimer.nextInvocation();
      const end = clockOutTimer && clockOutTimer.nextInvocation();
      if (!start && !end) {
        ctx.reply(`I've nothing to do today nor tomorrow.`);
      }
    }
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}