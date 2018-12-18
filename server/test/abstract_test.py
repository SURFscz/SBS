import datetime
import json
import os

import requests
from flask_testing import TestCase



class AbstractTest(TestCase):

    def create_app(self):
        os.environ["CONFIG"] = "config/test_config.yml"
        os.environ["TEST"] = "1"

        from server.__main__ import app

        config = app.app_config
        config["profile"] = None
        config.test = True
        return app

    @staticmethod
    def init_database(db, config, db_name):
        db.drop_database(db_name)
        db.create_database(db_name)
        db.switch_database(db_name)
        file = f"{os.path.dirname(os.path.realpath(__file__))}/seed/seed.json"

        def add_date_tags(entry):
            rd = datetime.datetime.utcfromtimestamp(entry["time"] // 1000000000)
            entry["tags"]["year"] = f"{rd.year}"
            entry["tags"]["quarter"] = f"{((rd.month-1)//3) + 1}"
            entry["tags"]["month"] = rd.strftime("%m")
            return entry

        with open(file) as f:
            json_body = json.loads(f.read())
            json_body_with_data_tags = list(map(add_date_tags, json_body))
            db.write_points(json_body_with_data_tags)


    def get(self, url, query_data={}, response_status_code=200, api="stats"):
        with requests.Session():
            response = self.client.get(f"/api/{api}/{url}",
                                       headers={"Authorization": "Basic ZGFzaGJvYXJkOnNlY3JldA=="},
                                       query_string=query_data)
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response.json

    @staticmethod
    def read_file(path):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/{path}"
        with open(file) as f:
            return f.read()
