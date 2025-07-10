FROM python:3.11

RUN apt-get update && apt-get install -y libxmlsec1-dev gettext && rm -rf /var/lib/apt/ /var/cache/apt/

WORKDIR /opt

COPY . server
RUN pip install --no-cache-dir -r server/requirements/test.txt

EXPOSE 8080

ENV CONFIG=config/config.yml

# DEFAULTS SUBSTITUTES...
ENV DATABASE_URI=mysql+mysqldb://sbs:sbs@127.0.0.1/sbs_test?charset=utf8mb4
ENV REDIS_URI=redis://localhost:6379/
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
  "envsubst <${CONFIG_TEMPLATE:-server/config/test_config.yml} >server/${CONFIG}; /usr/local/bin/gunicorn --worker-class eventlet --workers 8 --bind 0.0.0.0:8080 --timeout 300 --reload server.__main__:app;" \
  ]
