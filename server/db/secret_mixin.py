class SecretMixin(object):

    def __getattribute__(self, name):
        if name == "hashed_token" or name == "hashed_secret":
            return None
        return object.__getattribute__(self, name)
