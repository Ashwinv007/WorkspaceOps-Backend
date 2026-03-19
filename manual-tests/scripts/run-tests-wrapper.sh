#!/bin/bash

# Start server in background
echo "Starting server..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!

echo "Waiting for server to boot..."
MAX_RETRIES=30
count=0
while ! curl -s http://localhost:4000/health > /dev/null; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo "Server failed to start!"
        kill $SERVER_PID
        exit 1
    fi
done
echo "Server is up!"

# Run tests
./test-work-item.sh

# Kill server
echo "Stopping server..."
kill $SERVER_PID
