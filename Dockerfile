FROM  node

WORKDIR /usr/src/app

COPY ["./package.json","./package-lock.json","./"]

EXPOSE 3000

COPY . .

RUN npm install


CMD ["npm","run","start:dev"]
