FROM node:20-slim

RUN useradd -m -u 10001 openclaw
WORKDIR /workspace

COPY package.json ./
RUN npm install --omit=dev

COPY daily-task.mjs ./

USER 10001:10001

CMD ["node", "daily-task.mjs"]
