FROM node:10.7.0-stretch

# Create app directory
WORKDIR /usr/src/app

COPY shell.sh ./
COPY index.js ./
COPY .env
COPY package.json
RUN npm install --only=production

RUN chmod 777 shell.sh

EXPOSE 80

CMD [ "/usr/src/app/shell.sh" ]
