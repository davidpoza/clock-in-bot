
require('dotenv').config();
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const moment = require('moment');
const get = require('lodash.get');
const fetch = require('node-fetch');

isFromMe = (ctx, fn, fn_anonymous = () => { ctx.reply("I don't know who you are... I'll ignore you."); }) => {
  get(ctx, 'update.message.from.username') === 'davidpoza' ? fn() : fn_anonymous && fn_anonymous();
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

initJobs = () => {
  globalTimer = schedule.scheduleJob('0 0 0 * * *', () => {
    if (!isWorkday(moment(), daysOff, holidays)) {
      const clockInHour = moment(`${randomHour(process.env.MIN_START_HOUR, process.env.MAX_START_HOUR)} ${moment().format('DD/MM/YYYY')}`, 'HH:mm DD/MM/YYYY');
      const workingTimeDurationInMins = randomNumber(minWorkingTimeDuration, maxWorkingTimeDuration);
      const clockOutHour = moment(clockInHour).add(workingTimeDurationInMins, 'minutes');
      bot.telegram.sendMessage(chatId, `hora de entrada: ${clockInHour.format("HH:mm")}`);
      bot.telegram.sendMessage(chatId, `hora de salida: ${clockOutHour.format("HH:mm")}`);
      clockInTimer = schedule.scheduleJob(clockInHour.toDate(), () => {

      });
      clockOutTimer = schedule.scheduleJob(clockOutHour.toDate(), () => {

      });
    }
  });
};

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
const minWorkingTimeDuration = process.env.MIN_WORKINGDAY_DURATION*60; //in minutes
const maxWorkingTimeDuration = process.env.MAX_WORKINGDAY_DURATION*60; //in minutes

bot.start((ctx) => {
  isFromMe(ctx, () => {
    ctx.reply('Bot initialized!');
    ctx.reply('Setting jobs...');
    chatId = getChatId(ctx);
    initJobs();
  }, () => {
    ctx.reply("I don't know who you are... I'll ignore you.");
  });
});
bot.command('init_timer', (ctx) => {
  isFromMe(ctx, () => {
    let date = new moment().add(1, 'minutes').toDate();
    j = schedule.scheduleJob(date, () => {
      console.log('ha pasado un minuto');
      ctx.reply('Ya ha pasado un minuto');
    });
    ctx.reply('Te avisaré en un minuto');
  });
});

bot.command('login', (ctx) => {
  isFromMe(ctx, () => {
    fetch(process.env.BASE_URL+process.env.LOGIN_URL, {
      method: 'POST',
      credentials: 'include',
      mode: "cors",
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'gestionitt.grupo-arelance.com',
        Origin: 'http://gestionitt.grupo-arelance.com',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        Referer: 'http://gestionitt.grupo-arelance.com/',
      },
      referrer: "http://gestionitt.grupo-arelance.com/",
      body: JSON.stringify({
        usuario: process.env.USERNAME,
        password: process.env.PASSWORD,
      }),
    })
      .then((res) => {
        const jsessionid = parseCookie(res.headers.raw()['set-cookie']);
        console.log(jsessionid)
        return fetch(process.env.BASE_URL+process.env.START_WORK_URL, {
          method: 'POST',
          mode: "cors",
          credentials: 'include',
          headers: {
            Accept: '*/*',
            'Content-Length': '0',
            Cookie: jsessionid,
            //Cookie: 'JSESSIONID=B500EF35EC941D1AF82D29412290E5F0',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Accept-Language': 'es,en;q=0.9,en-GB;q=0.8,sr;q=0.7',
            Host: 'gestionitt.grupo-arelance.com',
            Origin: 'http://gestionitt.grupo-arelance.com',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: 'http://gestionitt.grupo-arelance.com/',
          },
          referrer: "http://gestionitt.grupo-arelance.com/",
          referrerPolicy: "no-referrer-when-downgrade",
        });
      })
      .then((res) => {
        return (res.text());
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        bot.telegram.sendMessage(chatId, 'Error ocurred on login', err);
      });
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