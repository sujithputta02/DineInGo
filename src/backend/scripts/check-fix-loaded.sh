#!/bin/bash

echo "🔍 Checking if cancellation fix is loaded..."
echo ""

# Check if server is running
if ! curl -s http://localhost:5001/api/bookings/health/cancellation-fix > /dev/null 2>&1; then
    echo "❌ Backend server is NOT running!"
    echo ""
    echo "Start the server with:"
    echo "  cd backend"
    echo "  npm run dev"
    exit 1
fi

# Get the health check response
response=$(curl -s http://localhost:5001/api/bookings/health/cancellation-fix)

# Check if fix is applied
if echo "$response" | grep -q '"fixApplied":true'; then
    echo "✅ Cancellation fix is LOADED and ACTIVE!"
    echo ""
    echo "Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    echo "🎉 You're ready to test! Cancel a booking and it will automatically unblock the table."
else
    echo "❌ Cancellation fix is NOT loaded!"
    echo ""
    echo "Please restart the backend server:"
    echo "  cd backend"
    echo "  npm run build"
    echo "  npm run dev"
    exit 1
fi
