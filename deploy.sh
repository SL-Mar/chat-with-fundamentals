#!/bin/bash
echo "Setting up environment..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy example env if no .env exists
if [ ! -f .env ]; then
  cp .env.model .env
  echo ".env file created. Please update your keys."
fi

# Optional: Run dev server
# uvicorn main:app --reload
