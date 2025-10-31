#!/bin/bash

# Test OpenAI API Key
echo "Testing OpenAI API Key..."
echo ""

# Get API key from .env
API_KEY=$(grep "LLM_API_KEY_OR_MOCK" .env | cut -d= -f2)

if [ "$API_KEY" = "MOCK" ]; then
    echo " API key is set to MOCK"
    echo "Please update .env with your real OpenAI API key"
    exit 1
fi

echo "API Key (first 20 chars): ${API_KEY:0:20}..."
echo ""
echo "Testing API call..."

# Test API call
response=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/models \
  -H "Authorization: Bearer $API_KEY")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo " API key is valid!"
    echo ""
    echo "Available models (first 3):"
    echo "$body" | grep -o '"id":"[^"]*"' | head -3
    echo ""
    echo "You can now use the real OpenAI API."
elif [ "$http_code" = "401" ]; then
    echo " API key is INVALID (Unauthorized)"
    echo ""
    echo "Possible issues:"
    echo "  1. Key is expired or revoked"
    echo "  2. Key is incorrect"
    echo ""
    echo "Solutions:"
    echo "  - Go to https://platform.openai.com/api-keys"
    echo "  - Create a new API key"
    echo "  - Update .env with the new key"
elif [ "$http_code" = "429" ]; then
    echo "  Rate limit exceeded"
    echo "Wait a few minutes and try again"
else
    echo " Error: HTTP $http_code"
    echo "Response: $body"
fi

echo ""
echo "To update your API key:"
echo "  nano .env"
echo "  # Change LLM_API_KEY_OR_MOCK=MOCK to LLM_API_KEY_OR_MOCK=sk-your-key"

