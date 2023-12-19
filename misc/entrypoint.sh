#!/bin/sh
# Do things we need to do before running CMD
rm -f /opt/sbs/server/config/config.yml
rm -f /opt/sbs/server/migrations/alembic.ini
rm -f /opt/sbs/client/build/static/disclaimer.css
rm -rf /opt/sbs/server/config/saml/saml
ln -s /opt/sbs/config/config.yml      /opt/sbs/server/config/config.yml
ln -s /opt/sbs/config/alembic.ini     /opt/sbs/server/migrations/alembic.ini
ln -s /opt/sbs/config/saml            /opt/sbs/server/config/saml
cp /opt/sbs/config/disclaimer.css     /opt/sbs/client/build/static/disclaimer.css

# Run migrations
cd /opt/sbs/server
/usr/local/bin/alembic --config /opt/sbs/server/migrations/alembic.ini upgrade head

cp /opt/sbs/cert/frontend.crt /usr/local/share/ca-certificates/
update-ca-certificates

cd /opt/sbs

# Hand off to the CMD
exec $@
