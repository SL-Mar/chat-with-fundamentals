#!/bin/bash
# Fix dependency conflicts in chat-with-fundamentals

echo "=== Fixing Backend Dependencies ==="
cd /home/slmar/projects/chat-with-fundamentals/backend

echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "=== Current Versions ==="
pip list | grep -E "(langchain|openai|crewai)" || true

echo ""
echo "=== Upgrading Core Packages ==="
pip install --upgrade pip

echo ""
echo "=== Installing Compatible Versions ==="
pip install --upgrade openai
pip install --upgrade langchain-openai
pip install --upgrade langchain-core
pip install --upgrade langchain-community
pip install --upgrade crewai
pip install --upgrade crewai-tools

echo ""
echo "=== Verifying Installation ==="
pip list | grep -E "(langchain|openai|crewai)"

echo ""
echo "=== Restarting Application ==="
cd /home/slmar/projects/chat-with-fundamentals
./launch.sh
