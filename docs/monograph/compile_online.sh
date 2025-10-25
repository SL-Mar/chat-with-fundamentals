#!/bin/bash
# Script to compile LaTeX using Overleaf API or similar

echo "LaTeX is not installed in this environment."
echo ""
echo "To compile the document, you have several options:"
echo ""
echo "1. LOCAL COMPILATION (Recommended):"
echo "   - Copy the docs/monograph/ folder to your local machine"
echo "   - Install LaTeX: sudo apt-get install texlive-full (Ubuntu)"
echo "   - Run: cd docs/monograph && make"
echo ""
echo "2. OVERLEAF (Online):"
echo "   - Visit https://www.overleaf.com/"
echo "   - Create new project -> Upload Project"
echo "   - Upload all files from docs/monograph/"
echo "   - Click 'Recompile' to generate PDF"
echo ""
echo "3. DOCKER (Isolated environment):"
echo "   - docker run --rm -v \$(pwd):/work -w /work texlive/texlive pdflatex main.tex"
echo ""
echo "Required files to upload/copy:"
ls -1 *.tex *.md Makefile 2>/dev/null || true
