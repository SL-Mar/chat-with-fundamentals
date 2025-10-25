#!/bin/bash

# Install Dependencies Script
# Run this after pulling new changes

echo "Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "✅ Dependencies installed!"
echo "Now run: ./launch.sh"
