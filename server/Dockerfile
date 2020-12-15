FROM python:3.6

WORKDIR /opt

COPY . server
RUN pip install --no-cache-dir -r server/requirements/base.txt

# For pytest...
RUN pip install pytest responses flask_testing hbmqtt

EXPOSE 8080

CMD [ "uwsgi", "--socket", "0.0.0.0:8080", "--protocol=http", "--module", "server.__main__:app" ]
