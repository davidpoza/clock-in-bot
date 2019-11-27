require('dotenv').config();
const moment = require('moment-timezone');
const get = require('lodash.get');
const fetch = require('node-fetch');
const commands = require('./commands.js');

isFromMe = (ctx, fn, fn_anonymous=() => { ctx.reply("I don't know who you are... I'll ignore you."); }) => {
  get(ctx, 'update.message.from.username') === process.env.TELEGRAM_USERNAME ? fn() : fn_anonymous && fn_anonymous();
};

getChatId = (ctx) => {
  return get(ctx, 'update.message.chat.id');
}

isWorkday = (date, daysOff, holidays) => {
  let dow = moment.tz(date, process.env.MOMENT_TZ).isoWeekday(); //1:lunes, 7:domingo
  let formattedDate=moment.tz(date, process.env.MOMENT_TZ).format('DD/MM/YYYY');
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

loginRequest = () => {
  return fetch(process.env.BASE_URL+process.env.loginRequest_URL, {
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
    body: `numIntentos=&usuario=${process.env.loginRequest_USERNAME}&password=${process.env.loginRequest_PASSWORD}&g-recaptcha-response=`,
  })
}

clockInOutRequest = (cookie, endpoint) => {
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

setJobs = (ctx, bot, schedule, clockInTimer, clockOutTimer, daysOff, holidays) => {
  const chatId = getChatId(ctx);
console.log("--------", clockInTimer);
console.log("++++++", clockOutTimer);
  if (!isEmpty(clockInTimer) && clockInTimer.nextInvocation() !== null) {
    clockInTimer.cancelNext();
    console.log("cancelando job entrada");
  }
  if (!isEmpty(clockOutTimer) && clockOutTimer.nextInvocation() !== null) {
    clockOutTimer.cancelNext();
    console.log("cancelando job salida");
  }
  if (isWorkday(moment.tz(process.env.MOMENT_TZ), daysOff, holidays)) {
    const workingTimeDurationInMins = randomNumber(
      process.env.MIN_WORKINGDAY_DURATION*60, process.env.MAX_WORKINGDAY_DURATION*60
    );
    const clockInHour = moment.tz(
      `${moment.tz(process.env.MOMENT_TZ).format('YYYY-MM-DD')} ${randomHour(process.env.MIN_START_HOUR, process.env.MAX_START_HOUR)}:00`,
      'YYYY-MM-DD HH:mm:ss',
      process.env.MOMENT_TZ
    );
    const clockOutHour = moment.tz(clockInHour, process.env.MOMENT_TZ).add(workingTimeDurationInMins, 'minutes');
    bot.telegram.sendMessage(chatId, `I\'m going to start work at: ${clockInHour.format("HH:mm")}`);
    clockInTimer = Object.assign(clockInTimer, schedule.scheduleJob(clockInHour.toDate(), () => {
      commands.clockInCommand(ctx, bot);
    }));
    bot.telegram.sendMessage(chatId, `I\'m going to finish work at: ${clockOutHour.format("HH:mm")}`);
    clockOutTimer = Object.assign(clockOutTimer, schedule.scheduleJob(clockOutHour.toDate(), () => {
      commands.clockOutCommand(ctx, bot);
    }));
  } else {
    bot.telegram.sendMessage(chatId, `Today I'm not going to work.`);
  }
  console.log(schedule)
};

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

module.exports.isFromMe = isFromMe;
module.exports.getChatId = getChatId;
module.exports.isWorkday = isWorkday;
module.exports.randomHour = randomHour;
module.exports.randomNumber = randomNumber;
module.exports.parseCookie = parseCookie;
module.exports.getDomain = getDomain;
module.exports.loginRequest = loginRequest;
module.exports.clockInOutRequest = clockInOutRequest;
module.exports.setJobs = setJobs;
