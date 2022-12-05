from eventlet.green import ssl
import redis
import eventlet
import socket
eventlet.monkey_patch()


# work around eventlet bug https://github.com/eventlet/eventlet/issues/692
# safe to remove once that is fixed
ssl.timeout_exc = socket.timeout


def init_redis(app_conf):
    return redis.from_url(app_conf.redis.uri)
