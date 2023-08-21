FROM  node

WORKDIR /usr/src/app

COPY ["./package.json","./package-lock.json","./"]

EXPOSE 3000

RUN npm install

COPY . .

RUN npm run build
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run start:dev; else npm run start:prod; fi"]
