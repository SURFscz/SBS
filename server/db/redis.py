import redis


def init_redis(app_conf):
    return redis.from_url(app_conf.redis.uri)
