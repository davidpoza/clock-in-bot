require('dotenv').config();
const moment = require('moment-timezone');
const functions = require('./functions.js');

/**
 * TODO: transform into pure function
 */
module.exports.initJobsCommand=(ctx, schedule, db) => {
  if (!schedule.scheduledJobs.globalTimer) {
    ctx.reply('Setting main and secondary jobs...');
    schedule.scheduleJob('globalTimer', '0 0 0 * * *', () => {
      functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), db);
    });
  } else {
    ctx.reply('Force resetting secondary jobs now...');
    functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), db);
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

module.exports.holidaysCommand=(ctx, db) => {
  functions.isFromMe(ctx, () => {
    const holidays = db.get('holidays').value();
    const daysOff = db.get('daysOff').value();
    ctx.reply(`Your holdays are: \n${holidays.length === 0 ? 'there are no holidays' : holidays.join('\n')}`);
    ctx.reply(`Your days-off are: \n${daysOff.length === 0 ? 'there are no days-off' : daysOff.join('\n')}`);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

module.exports.addRemoveDateCommand=(ctx, cal, msg) => {
  functions.isFromMe(ctx, () => {
    functions.launchCalendar(ctx, cal, msg);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

module.exports.statusCommand=(ctx, schedule, db) => {
  functions.isFromMe(ctx, () => {
    // reset jobs
    functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ), db);
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
      functions.setJobs(ctx, schedule, moment.tz(process.env.MOMENT_TZ).add(1, 'days'), db);
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