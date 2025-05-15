#!/bin/bash

# pre-run script for the SBS container
# this runs before the container drop privileges

set -e

if [ $UID -ne 0 ]
then
    echo "This container need to run as root"
    echo "Use USER/GROUP environment variables to specify the uid/gid to run as"

    exit 1
fi

# if the config dir is mounted from the host, the provided config files
# override the defaults from the container image
# make sure the config file are readable by the application
CONF_DIR=/sbs-config
CONF_UID=${RUNAS_UID:-0}
INSTALL="install --verbose --owner=$CONF_UID --mode=0400"
if [ -e "$CONF_DIR/config.yml" ]
then
    $INSTALL "$CONF_DIR/config.yml" /opt/sbs/server/config/config.yml
fi

if [ -e "$CONF_DIR/alembic.ini" ]
then
    $INSTALL "$CONF_DIR/alembic.ini" /opt/sbs/server/migrations/alembic.ini
fi

if [ -e "$CONF_DIR/disclaimer.css" ]
then
    $INSTALL "$CONF_DIR/disclaimer.css" /opt/sbs/client/build/static/disclaimer.css
fi


# and copy any certs that are provided
if [ -d "$CONF_DIR/cert" ]
then
    mkdir -p /usr/local/share/ca-certificates
    for cert in "$CONF_DIR/cert"/*
    do
        cp "$cert" /usr/local/share/ca-certificates/
    done
    update-ca-certificates
fi
