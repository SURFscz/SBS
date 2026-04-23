#!/usr/bin/bash
cd /opt/app/client
yarn
exec yarn dev --host 0.0.0.0 --port 8080
