# Stage 1. - Client build environment
FROM node:20 as yarn-deps

WORKDIR /opt/app

COPY . .
RUN yarn
RUN yarn build

# Stage 2. - Client build
FROM ghcr.io/surfscz/sram-sbs-server:main

WORKDIR /opt/app

COPY --from=yarn-deps /opt/app/build /var/www/html
