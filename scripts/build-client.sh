#!/bin/sh
set -e

IMAGE_NAME=surfscz/sbs-client

if [ -n "$1" ]
then
    # version was specified on command line
    IMAGE_VERSION=$1
else
    # if no IMAGE_VERSION is specified, use the current commit
    IMAGE_VERSION=git-$(git rev-parse HEAD)
fi

IMAGE_TAG=${IMAGE_NAME}:${IMAGE_VERSION}

# build
docker build -t ${IMAGE_TAG} -f client/Dockerfile.prod client/

# also tag this image with the current branch name if we're autobuilding in travis
if [ -n "$TRAVIS_BRANCH" ]
then
    docker tag ${IMAGE_TAG} "${IMAGE_NAME}:${TRAVIS_BRANCH}"
fi

exit 0
