#!/bin/sh
npm run build
NODE_ENV=production node server.ts > crash.log 2>&1 &
sleep 3
cat crash.log
kill $!
