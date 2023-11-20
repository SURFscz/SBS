#!/bin/bash
set -e

if [ "$1" = "" ]
then
    echo "Please specify input image"
fi
if [ "$2" = "" ]
then
    echo "Please specify xxioutimage"
fi

IN=$1
OUT=$2

W=480
H=348

convert "$IN" -resize "${W}x${H}^" -background '#ffffff00' -gravity center -extent "${W}x${H}" "$OUT"

file "$OUT"

exit 0