#!/bin/sh
IMAGE_VERSION=test

IMAGE_NAME=surfscz/sbs-server
IMAGE_TAG=${IMAGE_NAME}:${IMAGE_VERSION}

docker build -t ${IMAGE_TAG} .
