FROM python:3.7

RUN apt-get update
RUN apt-get install -y libxmlsec1-dev gettext

WORKDIR /opt

COPY . server
RUN pip install --no-cache-dir -r server/requirements/test.txt

EXPOSE 8080

ENV CONFIG=config/_config.yml

# DEFAULTS SUBSTITUTES...
ENV REDIS_host=localhost
ENV REDIS_PORT=6379
ENV SOCKET_URL=127.0.0.1:8080/
ENV SECRET=secret
ENV CLIENT_ID=sram
ENV CLIENT_SECRET=secret
ENV AUDIENCE=http://localhost:9001
ENV BASE_URL=http://localhost:8080
ENV ADMIN=admin
ENV LDAP_URL=ldap://ldap.example.com/dc=example,dc=com
ENV LDAP_BIND=cn=admin,dc=entity_id,dc=services,dc=example,dc=com

CMD [ "/bin/bash", "-c", \
  "envsubst <${CONFIG_TEMPLATE:-server/config/test_config.yml} >server/${CONFIG}; uwsgi --socket 0.0.0.0:8080 --protocol=http --module server.__main__:app;" \
]