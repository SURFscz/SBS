#!/usr/bin/env python3

# This script import the test seed data into an existing SBS instance/database
# Useful for deploying test instances

import sys
import os

os.environ["CONFIG"] = "config/config.yml"
sys.path.insert(0, "/opt/sbs/sbs")

from server.test.seed import seed  # noQA:E402
from server.__main__ import app    # noQA:E402

db = app.db
with app.app_context():
    seed(db, app.app_config)

sys.exit()
