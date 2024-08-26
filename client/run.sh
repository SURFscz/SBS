#!/usr/bin/bash
cd /opt/app/client
source .env
export SBS_SERVER
envsubst < package.json.tpl > package.json
yarn
yarn start
