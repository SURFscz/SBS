FROM python:3.6

WORKDIR /opt

COPY . server
RUN pip install --no-cache-dir -r server/requirements/test.txt

EXPOSE 8080

CMD [ "uwsgi", "--socket", "0.0.0.0:8080", "--protocol=http", "--module", "server.__main__:app" ]
