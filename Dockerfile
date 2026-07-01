# Imagem oficial do Playwright ja vem com o Chromium e todas as
# dependencias de sistema instaladas - evita ter que rodar
# "playwright install --with-deps" manualmente dentro do container.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# HEADLESS deve ser "true" em producao (container nao tem tela)
ENV HEADLESS=true

CMD ["node", "src/watch.js"]
