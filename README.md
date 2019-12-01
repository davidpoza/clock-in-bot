
# Description

![](https://img.shields.io/badge/status-working-green) ![](https://img.shields.io/badge/built_with-node.js-%2351c93d) ![](https://img.shields.io/badge/built_with-docker-blue)

This is a Telegram bot which is able to automatically clock-in and clock-out in an hypothetical company presence control system.
It takes into account holidays, days off, lunch time or schedule cancelation.
Also it simulates random behaviour between customized limits.

# .env example settings

```
BOT_TOKEN=xxxxxxxxxxxxxxxxxxxx
TELEGRAM_USERNAME=username
MIN_WORKINGDAY_DURATION=9.5
MAX_WORKINGDAY_DURATION=10
MIN_START_HOUR=06:45
MAX_START_HOUR=07:00
BASE_URL=https://domain.com
LOGIN_URL=/endpoint0
START_WORK_ENDPOINT=/endpoint1
END_WORK_ENDPOINT=/endpoint2
LOGIN_USERNAME=xxx
LOGIN_PASSWORD=xxxxxx
MOMENT_TZ=Europe/Madrid
```

# Available commands

* /help
* /start
* /status
* /clock_in
* /clock_out
* /holidays
* /add_holiday (remove if it exists)
* /add_dayoff (remove if it exists)
* /tomorrow_not_work (acts as switch)
* /today_not_work (acts as switch)