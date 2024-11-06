#!/bin/bash

set -e

if [ $UID -ne 0 ]
then
    echo "This container need to run as root"
    echo "Use USER/GROUP environment variables to specify the uid/gid to run as"

    exit 1
fi

# Do things we need to do before running CMD
rm -f /opt/sbs/server/config/config.yml
rm -f /opt/sbs/server/migrations/alembic.ini
rm -f /opt/sbs/client/build/static/disclaimer.css
rm -rf /opt/sbs/server/config/saml/saml
ln -s /opt/sbs/config/config.yml      /opt/sbs/server/config/config.yml
ln -s /opt/sbs/config/alembic.ini     /opt/sbs/server/migrations/alembic.ini
ln -s /opt/sbs/config/saml            /opt/sbs/server/config/saml
cp /opt/sbs/config/disclaimer.css     /opt/sbs/client/build/static/disclaimer.css

if [ -e "/opt/sbs/cert/frontend.crt" ]
then
    cp /opt/sbs/cert/frontend.crt /usr/local/share/ca-certificates/
    update-ca-certificates
fi

# now we can drop privileges
PRIVDROP=
if [ -n "$USER" ]
then
    if [ -n "$GROUP" ]
    then
        echo "Switching to user $USER and group $GROUP"
        PRIVDROP="setpriv --reuid=$USER --regid=$GROUP --clear-groups"
    else
        echo "Switching to user $USER"
        PRIVDROP="setpriv --reuid=$USER"
    fi
    echo "New id is $($PRIVDROP id -u):$($PRIVDROP id -g)"
fi


cd /opt/sbs

# Run migrations
_RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}
_MIGRATIONS_ONLY=${MIGRATIONS_ONLY:-0}
if [ "$_RUN_MIGRATIONS" -eq 1 ] || [ "$_MIGRATIONS_ONLY" -eq 1 ]
then
    echo "Running migrations"
    cd /opt/sbs/server
    ${PRIVDROP} /usr/local/bin/alembic --config /opt/sbs/server/migrations/alembic.ini upgrade head

    if [ "$_MIGRATIONS_ONLY" -eq 1 ]
    then
        echo "Migrations done, exiting"
        exit 0
    fi
fi

# Hand off to the CMD
exec ${PRIVDROP} $@