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
/**
 * TODO: transform into pure function
 * Rescheduling of jobs to take into account daysOff changes.
 * Doesn't reset clockOutTimer if clockInTimer.nextInvocation === null,
 * that's said: a clock-in has happend.
 * We don't want desynchronize/break a cycle in process.
 * In short: clockOutTimer only can be cancelled if we are cancelling
 * clockInTimer first.
 * @param ctx {Object}: telegraf context
 * @param schedule {Object}: node-schedule object
 * @param day {Object}: moment day for which we're setting the timers
 * @param daysOff {Array<string>}: days-off dates list
 * @param holidays {Array<string>}: holidays dates list
 */
setJobs = (ctx, schedule, day, daysOff, holidays) => {
  let { clockInTimer, clockOutTimer } = schedule.scheduledJobs;

  if (clockInTimer) {
    clockInTimer.cancel(); //cancel() totally deletes the job from schedule.
    console.log("cancelling clockInTimer");
    if (clockOutTimer) {
      clockOutTimer.cancel();
      console.log("cancelling clockOutTimer");
    }
  }
  // since objects have changed, we point them again
  clockInTimer = schedule.scheduledJobs.clockInTimer;
  clockOutTimer = schedule.scheduledJobs.clockOutTimer;

  if (isWorkday(day, daysOff, holidays)) {
    const workingTimeDurationInMins = randomNumber(
      process.env.MIN_WORKINGDAY_DURATION*60, process.env.MAX_WORKINGDAY_DURATION*60
    );
    const clockInHour = moment.tz(
      `${day.format('YYYY-MM-DD')} ${randomHour(process.env.MIN_START_HOUR, process.env.MAX_START_HOUR)}:00`,
      'YYYY-MM-DD HH:mm:ss',
      process.env.MOMENT_TZ
    );
    const clockOutHour = moment.tz(clockInHour, process.env.MOMENT_TZ).add(workingTimeDurationInMins, 'minutes');
    // only reschedule if previously timer has been cancelled.
    if(!clockInTimer) {
      const j = schedule.scheduleJob('clockInTimer', clockInHour.toDate(), () => {
        commands.clockInCommand(ctx);
      });
      j && isToday(day) && ctx.reply(`I'm going to start work at ${clockInHour.format("HH:mm")}`);
      j && !isToday(day) && ctx.reply(`I'm going to start work on ${clockInHour.format("dddd D [at] HH:mm")}`);
    }
    // only reschedule if previously timer has been cancelled.
    if(!clockOutTimer) {
      const j = schedule.scheduleJob('clockOutTimer', clockOutHour.toDate(), () => {
        commands.clockOutCommand(ctx);
      });
      j && isToday(day) && ctx.reply(`I'm going to finish work at ${clockOutHour.format("HH:mm")}`);
      j && !isToday(day) && ctx.reply(`I'm going to finish work on ${clockOutHour.format("dddd D [at] HH:mm")}`);
    }
  }
};

jobRangeToString = (j1, j2) => {
  const date1 = j1 && j1.nextInvocation();
  const date2 = j2 && j2.nextInvocation();
  return (`
    ${moment.tz(new Date(date1), process.env.MOMENT_TZ).format('HH:mm')} to
    ${moment.tz(new Date(date2), process.env.MOMENT_TZ).format('HH:mm')}
  `);
}

isToday = (day) => {
  return (moment.tz(process.env.MOMENT_TZ).diff(day, 'days') === 0)
}

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
module.exports.jobRangeToString = jobRangeToString;
module.exports.isToday = isToday;
