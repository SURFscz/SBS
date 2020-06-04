# -*- coding: future_fstrings -*-
import paho.mqtt.publish as publish
import paho.mqtt.subscribe as subscribe
from server.api.base import ctx_logger

class MqttClient():
    enabled = False
    client_id = None
    host = None
    auth = dict()

    def __init__(self, service_bus_conf, *args, **kwargs):
        self.enabled = service_bus_conf['enabled']
        self.host = service_bus_conf['host']
        self.client_id = service_bus_conf['client_id']
        self.auth = { 'username': service_bus_conf['user'], 'password': service_bus_conf['password'] }

    def publish(self, *args, **kwargs):
        r = False
        if self.enabled:
            try:
                publish.single(*args, hostname=self.host, retain=False, qos=1, client_id=self.client_id, auth=self.auth, **kwargs)
                r = True
            except Exception as e:
                logger = ctx_logger("mqtt_client")
                logger.debug(f"Fail {e}")
        return r

    def subscribe(self, *args, **kwargs):
        r = False
        if self.enabled:
            try:
                msg = subscribe.simple(*args, hostname=self.host, qos=1,  client_id=self.client_id, auth=self.auth, clean_session=False, **kwargs)
                r = msg
            except Exception as e:
                logger = ctx_logger("mqtt_client")
                logger.debug(f"Fail {e}")
        return r

