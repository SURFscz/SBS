# -*- coding: future_fstrings -*-
import paho.mqtt.client as client

from server.api.base import ctx_logger


class MqttClient(client.Client):
    enabled = False

    def __init__(self, service_bus_conf, *args, **kwargs):
        self.enabled = service_bus_conf.enabled
        if self.enabled:
            super(MqttClient, self).__init__(service_bus_conf.client_id, clean_session=False, *args, **kwargs)
            self.username_pw_set(service_bus_conf.user, password=service_bus_conf.password)
            self.connect(service_bus_conf.host)
            self.loop_start()

    def publish(self, *args, **kwargs):
        if self.enabled:
            try:
                return super(MqttClient, self).publish(*args, **kwargs)
            except Exception as e:
                logger = ctx_logger("mqtt_client")
                logger.error(f"Exception {e} in MqttClient.publish")
        return False
