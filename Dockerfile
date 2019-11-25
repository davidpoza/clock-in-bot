FROM node:10.16.2-stretch

# Create app directory
WORKDIR /usr/src/app

COPY shell.sh ./
COPY index.js ./
COPY commands.js ./
COPY functions.js ./
COPY .env ./
COPY package.json ./
RUN npm install --only=production

RUN chmod 777 shell.sh

CMD [ "/usr/src/app/shell.sh" ]
