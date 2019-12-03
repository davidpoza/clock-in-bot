require('dotenv').config();
const moment = require('moment-timezone');
const fn = require('./functions.js');

it('isToday', () => {
  let t = moment.tz(process.env.MOMENT_TZ);
  expect(isToday(t)).toBe(true);
  t = moment.tz(process.env.MOMENT_TZ).add(1, 'days');
  expect(isToday(t)).toBe(false);
})