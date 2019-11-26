# Description

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
loginRequest_URL=/endpoint0
START_WORK_ENDPOINT=/endpoint1
END_WORK_ENDPOINT=/endpoint2
loginRequest_USERNAME=xxx
loginRequest_PASSWORD=xxxxxx
MOMENT_TZ=Europe/Madrid
```

# Avaible commands

* /help
* /start
* /status
* /clock_in
* /clock_out
* /holidays
* /tomorrow_not_work
* /today_not_work