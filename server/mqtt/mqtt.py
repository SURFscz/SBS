import paho.mqtt.publish as publish

from server.logger.context_logger import ctx_logger


class MqttClient():
    enabled = False
    client_id = None
    host = None
    auth = dict()

    def __init__(self, service_bus_conf):
        self.enabled = service_bus_conf["enabled"]
        self.host = service_bus_conf["host"]
        self.client_id = service_bus_conf["client_id"]
        self.auth = {"username": service_bus_conf["user"], "password": service_bus_conf["password"]}

    def publish(self, topic, msg, qos=1):
        res = False
        if self.enabled:
            try:
                publish.single(topic, payload=msg, hostname=self.host, retain=False, qos=qos,
                               client_id=self.client_id, auth=self.auth)
                res = True
            except Exception as e:
                logger = ctx_logger("mqtt_client")
                logger.error(f"Fail {e}")
        return res
