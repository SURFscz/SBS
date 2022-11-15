# Stage 1. - Client build environment
FROM node:16 as yarn-deps

WORKDIR /opt/app

COPY . .
RUN yarn
RUN yarn build

# Stage 2. - Client build
FROM nginx

WORKDIR /opt/app

COPY --from=yarn-deps /opt/app/build /var/www
