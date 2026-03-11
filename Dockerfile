FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data uploads && \
    echo '{"projects":[],"pages":[]}' > data/data.json.default

RUN echo '#!/bin/sh\n\
if [ ! -f /app/data/data.json ]; then\n\
  cp /app/data/data.json.default /app/data/data.json\n\
fi\n\
exec node server.js' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
