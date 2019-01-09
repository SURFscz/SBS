import json
import os

import requests
from flask_testing import TestCase
from sqlalchemy import event

from server.test.seed import seed

BASIC_AUTH_HEADER = {"Authorization": "Basic c3lzYWRtaW46c2VjcmV0"}


# The database is cleared and seeded once and after each test the transaction is rolled back.
class AbstractTest(TestCase):

    def _pre_setup(self):
        super(AbstractTest, self)._pre_setup()
        self._start_transaction()

    def _post_teardown(self):
        try:
            self._close_transaction()
        finally:
            super(AbstractTest, self)._post_teardown()

    def _start_transaction(self):
        db = AbstractTest.app.db
        self.connection = db.engine.connect()
        self.trans = self.connection.begin()

        db.session = db.create_scoped_session(options={'bind': self.connection})
        db.session.begin_nested()

        @event.listens_for(db.session, "after_transaction_end")
        def restart_savepoint(session, transaction):
            if transaction.nested and not transaction._parent.nested:
                session.begin_nested()

        self._after_transaction_end_listener = restart_savepoint

    def _close_transaction(self):
        db = AbstractTest.app.db
        event.remove(db.session, "after_transaction_end", self._after_transaction_end_listener)
        db.session.close()
        db.get_engine(self.app).dispose()
        self.trans.rollback()
        self.connection.invalidate()

    def create_app(self):
        return AbstractTest.app

    @classmethod
    def setUpClass(cls):
        os.environ["CONFIG"] = "config/test_config.yml"
        os.environ["TEST"] = "1"

        from server.__main__ import app

        config = app.app_config
        config["profile"] = None
        config.test = True
        AbstractTest.app = app
        db = app.db
        with app.app_context():
            seed(db)

    def get(self, url, query_data={}, response_status_code=200):
        with requests.Session():
            response = self.client.get(url, headers=BASIC_AUTH_HEADER, query_string=query_data)
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response.json if hasattr(response, "json") else None

    def post(self, url, body={}, response_status_code=201):
        return self._do_call(body, self.client.post, response_status_code, url)

    def put(self, url, body={}, response_status_code=201):
        return self._do_call(body, self.client.put, response_status_code, url)

    def _do_call(self, body, call, response_status_code, url):
        with requests.Session():
            response = call(url, headers=BASIC_AUTH_HEADER, data=json.dumps(body),
                            content_type="application/json")
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response.json

    def delete(self, url, primary_key, response_status_code=204):
        with requests.Session():
            response = self.client.delete(f"{url}/{primary_key}", headers=BASIC_AUTH_HEADER,
                                          content_type="application/json")
            self.assertEqual(response_status_code, response.status_code)
