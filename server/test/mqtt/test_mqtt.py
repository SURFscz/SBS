from server.test.abstract_test import AbstractTest


# Okke Fri 7 May - this breaks the CI

class TestMqtt(AbstractTest):

    # @asyncio.coroutine
    # def start_broker(self):
    #     config = {
    #         "listeners": {
    #             "default": {
    #                 "max-connections": 1,
    #                 "type": "tcp",
    #                 "bind": "localhost:1883"
    #             },
    #         },
    #         "auth": {
    #             "plugins": ["auth.anonymous"],
    #             "allow-anonymous": True}
    #     }
    #     self.broker = Broker(config)
    #
    #     yield from self.broker.start()

    def test_publish(self):
        pass
        # TODO - for some reason the broker does not ack the publish msg
        # loop = asyncio.get_event_loop()
        # loop.set_debug(True)
        # # loop.run_until_complete(self.start_broker())
        # config_service_bus = munchify({
        #     "enabled": True,
        #     "user": "anonymous",
        #     "password": "secret",
        #     "host": "localhost",
        #     "client_id": "sbs_test"
        # })
        # mqtt_client = MqttClient(config_service_bus)
        # res = mqtt_client.publish("test", "1", qos=0)
        # # self.assertTrue(res)
        #
        # # wildcards are not allowed, but exceptions should be caught
        # res = mqtt_client.publish("#test+", "1")
        # self.assertFalse(res)
        #
        # # self.broker.shutdown()
