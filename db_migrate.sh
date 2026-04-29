#!/usr/bin/env bash

CONFIG_FILE="${1:-config/test_config.yml}"

source .venv/bin/activate
cd server
FLASK_APP='__main__.py' CONFIG="$CONFIG_FILE" flask db-migrate
