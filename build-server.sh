#!/bin/sh
IMAGE_VERSION=v0.0.1

IMAGE_NAME=surfscz/sbs-server
IMAGE_TAG=${IMAGE_NAME}:${IMAGE_VERSION}

docker build -t ${IMAGE_TAG} server/
