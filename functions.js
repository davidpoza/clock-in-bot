require('dotenv').config();
const moment = require('moment-timezone');
const get = require('lodash.get');
const fetch = require('node-fetch');
const commands = require('./commands.js');

/**
 * Executes fn() passed as parameter if message is sent by TELEGRAM_USERNAME user, set on .env file.
 * Otherwise execute anonymousFn().
 * @param {Object} ctx - Telegram message context
 */
isFromMe = (ctx, fn, anonymousFn = () => { ctx.reply(`I don't know who you are... I'll ignore you.`); }) => {
  get(ctx, 'update.message.from.username') === process.env.TELEGRAM_USERNAME ? fn() : fn_anonymous && anonymousFn();
};

getChatId = (ctx) => {
  return get(ctx, 'update.message.chat.id');
}

/**
 * Check if date provided as parameter is a working day.
 * It achieves that by reading current holidays and daysOff arrays from db.
 * @param {Object} date - Date as moment object.
 * @param {Object} db - lowdb database Object reference
 */
isWorkday = (date, db) => {
  const holidays = db.get('holidays').value();
  const daysOff = db.get('daysOff').value();
  let dow = moment.tz(date, process.env.MOMENT_TZ).isoWeekday(); //1:lunes, 7:domingo
  let formattedDate=moment.tz(date, process.env.MOMENT_TZ).format('DD/MM/YYYY');
  if (dow === 6 || dow === 7) {
    return false;
  }
  if (daysOff.includes(formattedDate) || holidays.includes(formattedDate))
    return false;
  return true;
}

/**
 * Returns random hour in format HH:MM between given min and max.
 * @param {string} min - Minimum hour (included) e.g: 14:20
 * @param {string} max - Maximum hour (included): e.g: 16:33
 */
randomHour = (min, max) => {
  let min_timestamp = moment(`${min} 01/01/2019`, 'HH:mm DD/MM/YYYY').unix();
  let max_timestamp = moment(`${max} 01/01/2019`, 'HH:mm DD/MM/YYYY').unix();
  let result_timestamp = Math.floor(Math.random() * (max_timestamp - min_timestamp)) + min_timestamp;
  return (moment(new Date(result_timestamp*1000)).format('HH:mm'));
}

/**
 * Returns random number between given min and max.
 * @param {number} min - Minimum hour (included) e.g: 14:20
 * @param {number} max - Maximum hour (included): e.g: 16:33
 */
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
    mode: 'cors',
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
    mode: 'cors',
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
 * Rescheduling of jobs to take into account daysOff changes.
 * clockOutTimer only can be cancelled if we are cancelling clockInTimer first.
 * @param {Object} ctx - Telegram message context
 * @param {Object} schedule - node-schedule Object reference, tracks all timers.
 * @param {Object} day - moment day for which we're setting the timers
 * @param {Object} db - lowdb database Object reference
 */
setJobs = (ctx, schedule, day, db) => {
  let { clockInTimer, clockOutTimer } = schedule.scheduledJobs;

  if (clockInTimer && clockInTimer.nextInvocation() !== null) { //if clockIn passed (nextInvocation is null) then not cancel clockOut
    clockInTimer.cancel(); //cancel() totally deletes the job from schedule.
    console.log('cancelling clockInTimer');
    if (clockOutTimer) {
      clockOutTimer.cancel();
      console.log('cancelling clockOutTimer');
    }
  }
  // since objects have changed, we point them again
  clockInTimer = schedule.scheduledJobs.clockInTimer;
  clockOutTimer = schedule.scheduledJobs.clockOutTimer;

  if (isWorkday(day, db)) {
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

      j && isToday(day) && ctx.reply(`I'm going to start work at ${clockInHour.format('HH:mm')}`);
      j && !isToday(day) && ctx.reply(`I'm going to start work on ${clockInHour.format('dddd D [at] HH:mm')}`);
    }
    // only reschedule if previously timer has been cancelled.
    if(!clockOutTimer) {
      const j = schedule.scheduleJob('clockOutTimer', clockOutHour.toDate(), () => {
        commands.clockOutCommand(ctx);
      });
      j && isToday(day) && ctx.reply(`I'm going to finish work at ${clockOutHour.format('HH:mm')}`);
      j && !isToday(day) && ctx.reply(`I'm going to finish work on ${clockOutHour.format('dddd D [at] HH:mm')}`);
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

/**
 * Check is date param provided is within current day.
 * @param date {Object}: Date as moment date Object.
 */
isToday = (date) => {
  return (moment.tz(process.env.MOMENT_TZ).isSame(date, 'day'))
}

/**
 * checks if timer next invocation has passed
 */
jobExecuted = (timer) => {
  console.log(timer.nextInvocation())
  return (
    moment.tz(
      new Date(timer.nextInvocation), process.env.MOMENT_TZ
    ).diff(moment.tz(process.env.MOMENT_TZ), 'seconds') < 0
  );
}

/**
 * Creates a response which displays calendar.
 * When we tap into a date an event is triggered and handled by function set with setDateListener(function)
 * @param {Object} ctx - Telegram message context
 * @param {Object} cal - Calendar Object
 * @param {string} msg - Text displayed just before calendar.
 */
launchCalendar = (ctx, cal, msg) => {
  const today = new Date();
	const minDate = new Date();
	minDate.setMonth(today.getMonth() - 1);
	const maxDate = new Date();
	maxDate.setMonth(today.getMonth() + 24);
	maxDate.setDate(today.getDate());

	ctx.reply(msg, cal.setMinDate(minDate).setMaxDate(maxDate).getCalendar())
};


/**
 * Receives a date as string and inserts it into array passed as *type* parameter if
 * that doesn't already exist, or deletes it if does.
 * @param {Object} ctx - Telegram message context
 * @param {Object} db - lowdb database Object reference
 * @param {string} date - Date as string formatted as YYYY-MM-DD
 * @param {string} type - Target array. Can be 'holidays' or 'daysOff'
 */
insertDeleteDay = (ctx, db, date, type) => {
  if (type !== 'holidays' && type !== 'daysOff') return;
  const formatedDate = moment.tz(date, 'YYYY-MM-DD', process.env.MOMENT_TZ).format('DD/MM/YYYY');
  const holidays = db.get('holidays').value();
  const daysOff = db.get('daysOff').value();
  if (type === 'holidays' && holidays.includes(formatedDate)) {
    holidays.splice( holidays.indexOf(formatedDate), 1 );
    db.set('holidays', holidays)
      .write();
    ctx.replyWithMarkdown(`*${formatedDate}* has been removed to your holidays calendar.`);
  } else if (type === 'daysOff' && daysOff.includes(formatedDate)) {
    daysOff.splice( daysOff.indexOf(formatedDate), 1 );
    db.set('daysOff', daysOff)
      .write();
    ctx.replyWithMarkdown(`*${formatedDate}* has been removed to your daysOff calendar.`);
  } else {
    db.get(type)
      .push(formatedDate)
      .write();
    ctx.replyWithMarkdown(`*${formatedDate}* has been added to your ${type} calendar.`);
  }
};

/**
 * Sorts ascendently a given dates string array.
 * The string have the DD/MM/YYYY format.
 */
sortDatesArray = (array) => {
  return array.sort((a, b) => {
    a = new moment(a, 'DD/MM/YYYY', process.env.MOMENT_TZ);
    b = new moment(b, 'DD/MM/YYYY', process.env.MOMENT_TZ);
    return a.isBefore(b) ? -1 : b.isBefore(a) ? 1 : 0;
  });
}

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
module.exports.jobExecuted = jobExecuted;
module.exports.launchCalendar = launchCalendar;
module.exports.insertDeleteDay = insertDeleteDay;
module.exports.sortDatesArray = sortDatesArray;