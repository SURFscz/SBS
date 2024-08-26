# Stage 1. - Client build environment
FROM node:20

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install gettext-base -y

WORKDIR /opt/app

ENTRYPOINT [ "/opt/app/client/run.sh" ]
