#!/bin/sh
set -e

echo "Waiting for Redis to be ready..."
/wait-for-redis.sh redis 6379 30
sleep 3

echo "Starting Product Service..."
exec java -jar /app/app.jar
