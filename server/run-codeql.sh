#!/bin/sh
set -e

rm -rf /tmp/codeql /tmp/codeql.csv /tmp/codeql.json
codeql database create /tmp/codeql --language=python
codeql database analyze /tmp/codeql --format=sarif-latest  --output=/tmp/codeql.json
codeql database analyze /tmp/codeql --format=csv  --output=/tmp/codeql.csv

cat /tmp/codeql.csv

exit 0
