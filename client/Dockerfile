# Stage 1. - Build process

FROM node:8 as build-deps

WORKDIR /opt/app

COPY package.json yarn.lock ./
RUN yarn

COPY . ./
RUN yarn build
RUN CI=true yarn test

# Stage 2. - Production environment

FROM nginx:1.12-alpine
COPY --from=build-deps /opt/app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
