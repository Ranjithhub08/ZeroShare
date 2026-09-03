#!/bin/bash
# Start ZeroShare — ML + Backend + Frontend

PROJECT="/Users/ranjithkumar/Zero share new/ZeroShare"

# Start ML service
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT/ml-service' && python3 main.py\""

# Start Backend
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT/backend' && node server.js\""

# Start Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT/frontend' && npm run dev && open http://localhost:5173\""
