import redis


def init_redis(app_conf):
    password = app_conf.redis.password
    return redis.Redis(host=app_conf.redis.host,
                       port=app_conf.redis.port,
                       password=password if password else None)
