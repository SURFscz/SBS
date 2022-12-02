from eventlet.green import ssl
import redis
import eventlet
import socket
eventlet.monkey_patch()


# work around eventlet bug https://github.com/eventlet/eventlet/issues/692
# safe to remove once that is fixed
ssl.timeout_exc = socket.timeout


def init_redis(app_conf):
    password = app_conf.redis.password
    return redis.Redis(host=app_conf.redis.host,
                       port=app_conf.redis.port,
                       password=password if password else None)
