FROM python:3.11-slim-bookworm

# Do an initial clean up and general upgrade of the distribution
ENV DEBIAN_FRONTEND noninteractive
RUN apt clean && apt autoclean && apt update
RUN apt -y upgrade && apt -y dist-upgrade

# Install the packages we need
RUN apt install -y curl \
  git \
  build-essential \
  pkgconf \
  python3-dev \
  default-libmysqlclient-dev \
  libxmlsec1-dev

# Clean up
RUN apt autoremove -y && apt clean && apt autoclean && rm -rf /var/lib/apt/lists/*

# Set the default workdir
WORKDIR /opt

# Install SBS
COPY sbs.tar.xz /opt/sbs.tar.xz

# Untar sbs
RUN tar -Jxf sbs.tar.xz

# Create venv dir
#RUN virtualenv /opt/sbs

#RUN . /opt/sbs/bin/activate && \
RUN pip install -r /opt/sbs/server/requirements/test.txt

# Copy entrypoint
COPY ./misc/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

# Set the default workdir
WORKDIR /opt/sbs

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
#CMD ["bash"]
CMD ["/usr/local/bin/gunicorn --worker-class eventlet --workers 8 --bind 0.0.0.0:80 server.__main__:app"]
