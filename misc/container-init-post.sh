#!/bin/bash

set -e

# this runs after the container drop privileges

# Run migrations
_RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}
_MIGRATIONS_ONLY=${MIGRATIONS_ONLY:-0}
if [ "$_RUN_MIGRATIONS" -eq 1 ] || [ "$_MIGRATIONS_ONLY" -eq 1 ]
then
    echo "Running migrations"
    cd /opt/sbs/server
    /usr/local/bin/alembic --config /opt/sbs/server/migrations/alembic.ini upgrade head

    if [ "$_MIGRATIONS_ONLY" -eq 1 ]
    then
        echo "Migrations done, exiting"
        exit 0
    fi
fi
