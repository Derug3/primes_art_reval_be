FROM node:alpine

ARG NODE_UID=1000
ARG NODE_GID=1000

RUN deluser --remove-home node \
  && addgroup -S node -g ${NODE_GID} \
  && adduser -S -G node -u ${NODE_UID} node

WORKDIR /usr/src/app
RUN chown node:node /usr/src/app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run start:dev; else npm run start:prod; fi"]
