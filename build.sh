#!/bin/bash -eu
set -ev

echo "Installing"
npm install --no-optional

echo 'Run testing'
npm test
npm run build

if [ "${TRAVIS_NODE_VERSION}" != "10.16.3" ]; then
    exit 0
fi

if [ -n "${TRAVIS_TAG:-}" ]; then
    echo 'Publishing on tag ${TRAVIS_TAG}'
    npm publish
fi
