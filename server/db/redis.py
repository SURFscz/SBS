from eventlet.green import ssl
import redis
import eventlet
import socket


def init_redis(app_conf):
    return redis.from_url(app_conf.redis.uri)
