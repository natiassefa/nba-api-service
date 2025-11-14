FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]

