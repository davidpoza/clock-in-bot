require('dotenv').config();
const moment = require('moment-timezone');
const functions = require('./functions.js');

/**
 * Initializes the main timer, which will schedule the others every night.
 * If is executed multiple times then check if globalTimer is already defined
 * to avoid repeated timers.
 * @param {Object} ctx - Telegram message context
 * @param {Object} schedule - node-schedule Object reference, tracks all timers.
 * @param {Object} db - lowdb database Object reference
 */
initJobsCommand = (ctx, schedule, db) => {
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

/**
 * @param {Object} ctx - Telegram message context
 */
clockInCommand = (ctx) => {
  functions.isFromMe(ctx, () => {
    functions.loginRequest()
      .then((res) => {
        const jsessionid=functions.parseCookie(res.headers.raw()['set-cookie']);
        return functions.clockInOutRequest(jsessionid, process.env.START_WORK_ENDPOINT);
      })
      .then((res) => {
        ctx.reply('I\'ve just clock-in my friend.👍');
        return functions.loginRequest();
      })
      .then((res) => {
        return res.text(); //we log in again to check if clock-in had effect
      })
      .then((data) => {
        if (!data.includes(`top " onclick="marcarFinJornada()`))
          throw new Error('Clock-in not registered');
      })
      .catch((err) => {
        ctx.reply('Error ocurred on clock-in');
      });
  });
}

/**
 * @param {Object} ctx - Telegram message context
 */
clockOutCommand = (ctx) => {
  functions.isFromMe(ctx, () => {
    functions.loginRequest()
      .then((res) => {
        const jsessionid = functions.parseCookie(res.headers.raw()['set-cookie']);
        return functions.clockInOutRequest(jsessionid, process.env.END_WORK_ENDPOINT);
      })
      .then((res) => {
        ctx.reply('I\'ve just clock-out!!. What such a hard working day👏🏼.');
        return functions.loginRequest();
      })
      .then((res) => {
        return res.text(); //we log in again to check if clock-out had effect
      })
      .then((data) => {
        if (!data.includes(`top oculto" onclick="marcarFinJornada()`))
          throw new Error('Clock-out not registered');
      })
      .catch((err) => {
        ctx.reply('Error ocurred on clockOutCommand');
      });
  });
}

/**
 * Returns a sorted list of all dates within holidays and daysOff arrays.
 */
holidaysCommand = (ctx, db) => {
  functions.isFromMe(ctx, () => {
    const holidays = db.get('holidays').value();
    const daysOff = db.get('daysOff').value();

    functions.sortDatesArray(holidays);
    functions.sortDatesArray(daysOff);

    ctx.replyWithMarkdown(`*Your holdays are*: \n ---------------------------
    ${holidays.length === 0 ? '_there are no holidays_' : '- ' + holidays.join('\n- ')}`.replace(/  +/g, ''));
    ctx.replyWithMarkdown(`*Your days-off are*: \n ---------------------------
    ${daysOff.length === 0 ? '_there are no days-off_': '- ' + daysOff.join('\n- ')}`.replace(/  +/g, ''));
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

/**
 * This command works like a switch: First we are asked for a date (using calendar).
 * Afterward it checks if date already exists in holidays array. If it doesn't exist
 * we insert it, but we remove it if does. Finally statusCommand is called to reload the timer jobs,
 * to take new dates into account.
 * @param {Object} ctx - Telegram message context
 */
addRemoveDateCommand = (ctx, cal, msg) => {
  functions.isFromMe(ctx, () => {
    functions.launchCalendar(ctx, cal, msg);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

/**
 * @param {Object} ctx - Telegram message context
 * @param {Object} schedule - node-schedule Object reference, tracks all timers.
 * @param {Object} db - lowdb database Object reference
 */
statusCommand = (ctx, schedule, db) => {
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
      ctx.reply(`I'm at work right now but it ends at ${moment.tz(new Date(end), process.env.MOMENT_TZ).format('HH:mm')}`);
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

/**
 * @param {Object} ctx - Telegram message context
 * @param {Object} schedule - node-schedule Object reference, tracks all timers.
 * @param {Object} db - lowdb database Object reference
 */
todayNotWorkCommand = (ctx, schedule, db) => {
  functions.isFromMe(ctx, () => {
    const date = moment.tz(process.env.MOMENT_TZ).format('YYYY-MM-DD');
    functions.insertDeleteDay(ctx, db, date, 'daysOff');
    // reset jobs
    statusCommand(ctx, schedule, db);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

/**
 * @param {Object} ctx - Telegram message context
 * @param {Object} schedule - node-schedule Object reference, tracks all timers.
 * @param {Object} db - lowdb database Object reference
 */
tomorrowNotWorkCommand = (ctx, schedule, db) => {
  functions.isFromMe(ctx, () => {
    const date = moment.tz(process.env.MOMENT_TZ).add(1, 'days').format('YYYY-MM-DD');
    functions.insertDeleteDay(ctx, db, date, 'daysOff');
    // reset jobs
    statusCommand(ctx, schedule, db);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
}

module.exports.initJobsCommand = initJobsCommand;
module.exports.clockInCommand = clockInCommand;
module.exports.clockOutCommand = clockOutCommand;
module.exports.holidaysCommand = holidaysCommand;
module.exports.addRemoveDateCommand = addRemoveDateCommand;
module.exports.statusCommand = statusCommand;
module.exports.todayNotWorkCommand = todayNotWorkCommand;
module.exports.tomorrowNotWorkCommand = tomorrowNotWorkCommand;
