FROM python:3.6

RUN apt-get update && apt-get install -y gettext-base && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY . server/
RUN pip install --no-cache-dir -r server/requirements/base.txt

EXPOSE 8080

ENV PROFILE=local

CMD ["python", "-m", "server"]
