FROM node:16.13.1-slim AS builder

WORKDIR /app
RUN mkdir /app/src

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install
RUN npm run build

FROM node:16.13.1-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node
RUN npm install --production

COPY --from=builder /app/build /app/build

EXPOSE 3672
CMD [ "node", "build/index.js" ]