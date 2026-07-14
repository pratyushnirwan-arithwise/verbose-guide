#!/bin/bash

# Port declarations
PORTS=(5550 5174 5009 5173)
NAMES=("Verbose-Guide Backend" "Verbose-Guide Frontend" "Trueday Backend" "Trueday Frontend")

echo "============================================="
echo "🔄 ARITHS & TRUEDAY Startup Orchestrator"
echo "============================================="

# Function to kill process on a port
kill_port() {
  local port=$1
  local name=$2
  local pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "⚠️ Port $port ($name) is active. Killing process $pid..."
    kill -9 $pid 2>/dev/null
    sleep 1
  else
    echo "✅ Port $port ($name) is free."
  fi
}

# Kill processes on all ports
for i in "${!PORTS[@]}"; do
  kill_port "${PORTS[$i]}" "${NAMES[$i]}"
done

echo "---------------------------------------------"
echo "🚀 Starting applications..."
echo "---------------------------------------------"

# Set up logging directory
LOG_DIR="/Users/arithwise/Desktop/verbose-guide/logs"
mkdir -p "$LOG_DIR"

# 1. Start Verbose-Guide Backend (Port 5550)
echo "💼 Starting Verbose-Guide Backend (Port 5550)..."
cd /Users/arithwise/Desktop/verbose-guide/backend
source venv/bin/activate
python app.py > "$LOG_DIR/verbose_backend.log" 2>&1 &
echo "   ↳ Log: $LOG_DIR/verbose_backend.log"

# 2. Start Verbose-Guide Frontend (Port 5174)
echo "💻 Starting Verbose-Guide Frontend (Port 5174)..."
cd /Users/arithwise/Desktop/verbose-guide/frontend
npm run dev -- --port 5174 > "$LOG_DIR/verbose_frontend.log" 2>&1 &
echo "   ↳ Log: $LOG_DIR/verbose_frontend.log"

# 3. Start Trueday Backend (Port 5009)
echo "📁 Starting Trueday Backend (Port 5009)..."
cd /Users/arithwise/Desktop/Trueday/trueday-our/new_backend
source .venv/bin/activate
python app.py > "$LOG_DIR/trueday_backend.log" 2>&1 &
echo "   ↳ Log: $LOG_DIR/trueday_backend.log"

# 4. Start Trueday Frontend (Port 5173)
echo "📋 Starting Trueday Frontend (Port 5173)..."
cd /Users/arithwise/Desktop/Trueday/trueday-our/my-vite-app
npm run dev -- --port 5173 > "$LOG_DIR/trueday_frontend.log" 2>&1 &
echo "   ↳ Log: $LOG_DIR/trueday_frontend.log"

sleep 3

echo "---------------------------------------------"
echo "✨ All servers launched successfully!"
echo "---------------------------------------------"
echo "🔗 Access Verbose-Guide: http://localhost:5174"
echo "🔗 Access Trueday:       http://localhost:5173"
echo "============================================="
echo "💡 To stop everything at any time, run: ./run_all.sh again (it will clear the ports)."
echo "============================================="
