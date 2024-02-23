#!/bin/bash
set -e

# script that checks that all translations are on the same line numbers in all locale files
# this is so it's easy to compare locale files and make consistent changes

echo '====================================================='
echo '== Checking line-sync between locale files'

# remove all strings from the locale lines and compare the files
# effectively, comparing that translations are on the same line numbers
if ! diff -Nau --color=always \
    <( sed 's/const .. = //; s/^export .*$//; s/".*$//;' < ./src/locale/en.js ) \
    <( sed 's/const .. = //; s/^export .*$//; s/".*$//;' < ./src/locale/nl.js )
then
    echo '== ERROR - line number mismatch'
    echo '====================================================='
    exit 1
else
    echo '== OK - All translations are on the same line numbers'
    echo '====================================================='
    exit 0
fi
