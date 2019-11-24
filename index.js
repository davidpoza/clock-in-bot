
require('dotenv').config();
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const moment = require('moment');
const get = require('lodash.get');
const fetch = require('node-fetch');

isFromMe = (ctx, fn, fn_anonymous = () => { ctx.reply("I don't know who you are... I'll ignore you."); }) => {
  get(ctx, 'update.message.from.username') === process.env.TELEGRAM_USERNAME ? fn() : fn_anonymous && fn_anonymous();
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

parseCookie = (str) => {
  const regex = /(JSESSIONID=[a-zA-Z0-9]*); Path=\//;
  return (regex.exec(str)[1]);
}

getDomain = (str) => {
  const regex = /https?:\/\/(.*)$/;
  return (regex.exec(str)[1]);
}

initJobs = (ctx) => {
  globalTimer = schedule.scheduleJob('0 17 18 * * *', () => {
    if (!isWorkday(moment(), daysOff, holidays)) {
      const clockInHour = moment(`18:18 ${moment().format('DD/MM/YYYY')}`, 'HH:mm DD/MM/YYYY');
      const workingTimeDurationInMins = randomNumber(minWorkingTimeDuration, maxWorkingTimeDuration);
      const clockOutHour = moment(clockInHour).add(workingTimeDurationInMins, 'minutes');
      bot.telegram.sendMessage(chatId, `I\`m going to start work at: ${clockInHour.format("HH:mm")}`);
      bot.telegram.sendMessage(chatId, `I\`m going to finish work at: ${clockOutHour.format("HH:mm")}`);
      clockInTimer = schedule.scheduleJob(clockInHour.toDate(), () => {
        clockInCommand(ctx);
      });
      clockOutTimer = schedule.scheduleJob(clockOutHour.toDate(), () => {
        clockOutCommand(ctx);
      });
    }
  });
};

login = () => {
  return fetch(process.env.BASE_URL+process.env.LOGIN_URL, {
    method: 'POST',
    credentials: 'include',
    mode: "cors",
    headers: {
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
      Host: getDomain(process.env.BASE_URL),
      Origin: process.env.BASE_URL,
    },
    referrer: process.env.BASE_URL + '/',
    referrerPolicy: 'no-referrer-when-downgrade',
    body: `numIntentos=&usuario=${process.env.LOGIN_USERNAME}&password=${process.env.LOGIN_PASSWORD}&g-recaptcha-response=`,
  })
}

clockInOut = (cookie, endpoint) => {
  return fetch(process.env.BASE_URL+endpoint, {
    method: 'POST',
    mode: "cors",
    credentials: 'include',
    headers: {
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'es,en;q=0.9,en-GB;q=0.8,sr;q=0.7',
      'Connection': 'keep-alive',
      'Content-Length': '0',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
      Cookie: cookie,
      Host: getDomain(process.env.BASE_URL),
      Origin: process.env.BASE_URL,
    },
    referrer: process.env.BASE_URL + '/',
  });
}

clockInCommand = (ctx) => {
  isFromMe(ctx, () => {
    login()
      .then((res) => {
        const jsessionid = parseCookie(res.headers.raw()['set-cookie']);
        return clockInOut(jsessionid, process.env.START_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-in my friend.👍');
        lastClockIn = moment();
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-in: ', err);
      });
  });
}

clockOutCommand = (ctx) => {
  isFromMe(ctx, () => {
    login()
      .then((res) => {
        const jsessionid = parseCookie(res.headers.raw()['set-cookie']);
        return clockInOut(jsessionid, process.env.END_WORK_ENDPOINT);
      })
      .then((res) => {
        bot.telegram.sendMessage(chatId, 'I\'ve just clock-out!!. What such a hard working day👏🏼.');
        lastClockOut = moment();
        lastClockIn = undefined;
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on clock-out: ', err);
      });
  });
}

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
let lastClockIn;
let lastClockOut;
const minWorkingTimeDuration = process.env.MIN_WORKINGDAY_DURATION*60; //in minutes
const maxWorkingTimeDuration = process.env.MAX_WORKINGDAY_DURATION*60; //in minutes

bot.start((ctx) => {
  isFromMe(ctx, () => {
    ctx.reply(`Welcome ${process.env.TELEGRAM_USERNAME}!`);
    ctx.reply('Bot initialized!');
    ctx.reply('Setting jobs...');
    chatId = getChatId(ctx);
    initJobs(ctx);
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
});

bot.command('clock_in', clockInCommand);

bot.command('clock_out', clockOutCommand);

bot.help((ctx) => {
  ctx.reply(`Available commands are:
  * /help
  * /start
  * /status
  * /clock_in
  * /clock_out
  * /holidays
  * /tomorrow_not_work
  * /today_not_work
  `);
});

bot.command('status', (ctx) => {
  if (!chatId) {
    ctx.reply('Nothing found... Try /start command.');
  } else if (chatId && lastClockIn) {
    bot.telegram.sendMessage(chatId, 'I\'m working since ' + lastClockIn.format('DD/MM/YYYY HH:mm'));
  } else if (chatId && lastClockOut) {
    bot.telegram.sendMessage(chatId, 'I finished work at ' + lastClockOut.format('DD/MM/YYYY HH:mm'));
  } else if (chatId && !lastClockIn && !clockInTimer && !clockOutTimer) {
    bot.telegram.sendMessage(chatId, 'I\'m resting. Today\'s my day off.');
  } else if (chatId && clockInTimer && clockInTimer.nextInvocation()) {
    bot.telegram.sendMessage(chatId, 'I\'m going to start to work at ' + moment(clockInTimer.nextInvocation()).format('DD/MM/YYYY HH:mm'));
  } else if (chatId && clockOutTimer && clockOutTimer.nextInvocation()) {
    bot.telegram.sendMessage(chatId, 'I\'m going to finish work at ' + moment(clockOutTimer.nextInvocation()).format('DD/MM/YYYY HH:mm'));
  }
});


bot.command('holidays', (ctx) => {
  isFromMe(ctx, () => {
    ctx.reply('Your holdays are:');
    ctx.reply(holidays.join('\n'));
    ctx.reply('and:');
    ctx.reply(daysOff.join('\n'));
  }, () => {
    ctx.reply('I don\'t know who you are... I\'ll ignore you.');
  });
});


/**
 * Example of history update
 *
 * fetch(process.env.BASE_URL+'/GestionITT/EmpleadoAction_updateHistoricoControlPresencia.action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            params: [
              { idControlPresencia: "xxxxx", horaInicio: "2020-11-21T06:48:00.000Z", horaFin: "2020-11-21T17:15:00.000Z" },
              { idControlPresencia: "xxxxx", horaInicio: "2020-11-20T06:48:00.000Z", horaFin: "2020-11-20T17:15:00.000Z" },
              { idControlPresencia: "xxxxx", horaInicio: "2020-11-19T06:48:00.000Z", horaFin: "2020-11-19T17:15:00.000Z" },
            ]
          }),
        });
 */


bot.startPolling();
bot.use(/*Telegraf.log()*/);