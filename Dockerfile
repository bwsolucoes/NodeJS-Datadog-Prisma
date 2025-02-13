FROM node:18-alpine

# Install OpenSSL 3.x and build dependencies
RUN apk update && apk add --no-cache \
    openssl3 \
    build-base \
    libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate the Prisma client
RUN npx prisma generate

RUN npm run build

CMD ["node", "dist/index.js"]
