#!/bin/bash

if [ ! -d "node_modules/signalk-parquet" ]; then
    npm install --save --production signalk-parquet
fi

/usr/lib/node_modules/signalk-server/bin/signalk-server --sample-n2k-data