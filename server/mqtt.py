# -*- coding: future_fstrings -*-
import paho.mqtt.client as client


class mqttClient(client.Client):
    enabled = False

    def __init__(self, app, *args, **kwargs):
        self.enabled = app.app_config.service_bus.enabled
        host = app.app_config.service_bus.host
        client_id = app.app_config.service_bus.client_id
        user = app.app_config.service_bus.user
        password = app.app_config.service_bus.password
        super(mqttClient, self).__init__(client_id, clean_session=False, *args, **kwargs)
        self.username_pw_set(user, password=password)
        if self.enabled:
            self.connect(host, keepalive=60)

    def publish(self, *args, **kwargs):
        if self.enabled:
            return super(mqttClient, self).publish(*args, **kwargs)

        return False
