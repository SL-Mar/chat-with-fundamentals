# Makefile for Quantitative Methods Monograph
# Uses pdflatex to compile the Springer template

# Main file (without .tex extension)
MAIN = main

# LaTeX compiler
LATEX = pdflatex
BIBTEX = bibtex
MAKEINDEX = makeindex

# Compiler flags
LATEXFLAGS = -interaction=nonstopmode -halt-on-error

# Output PDF
PDF = $(MAIN).pdf

# Auxiliary files
AUX_FILES = *.aux *.log *.toc *.out *.idx *.ilg *.ind *.bbl *.blg *.lof *.lot

.PHONY: all clean distclean view help

# Default target: build PDF
all: $(PDF)

# Build the PDF with multiple passes for cross-references
$(PDF): $(MAIN).tex chapter*.tex
	@echo "==> First LaTeX pass..."
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	@echo "==> Building index..."
	-$(MAKEINDEX) $(MAIN).idx 2>/dev/null
	@echo "==> Second LaTeX pass (cross-references)..."
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	@echo "==> Final LaTeX pass..."
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex
	@echo "==> Build complete: $(PDF)"

# Quick build (single pass, for draft checking)
draft: $(MAIN).tex
	@echo "==> Quick draft build..."
	$(LATEX) $(LATEXFLAGS) $(MAIN).tex

# Clean auxiliary files but keep PDF
clean:
	@echo "==> Cleaning auxiliary files..."
	rm -f $(AUX_FILES)

# Remove all generated files including PDF
distclean: clean
	@echo "==> Removing PDF..."
	rm -f $(PDF)

# View the PDF (platform-dependent)
view: $(PDF)
	@if command -v xdg-open > /dev/null; then \
		xdg-open $(PDF); \
	elif command -v open > /dev/null; then \
		open $(PDF); \
	elif command -v start > /dev/null; then \
		start $(PDF); \
	else \
		echo "Cannot find PDF viewer. Please open $(PDF) manually."; \
	fi

# Count pages in the compiled PDF
count: $(PDF)
	@echo "Page count:"
	@pdfinfo $(PDF) | grep Pages

# Check for LaTeX errors in the log
check:
	@echo "==> Checking for LaTeX errors..."
	@grep -i "error" $(MAIN).log || echo "No errors found"
	@echo "==> Checking for warnings..."
	@grep -i "warning" $(MAIN).log || echo "No warnings found"

# Display help
help:
	@echo "Quantitative Methods Monograph - Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all        - Build the PDF (default, runs 3 LaTeX passes)"
	@echo "  draft      - Quick single-pass build for checking"
	@echo "  clean      - Remove auxiliary files (.aux, .log, etc.)"
	@echo "  distclean  - Remove all generated files including PDF"
	@echo "  view       - Open the PDF in default viewer"
	@echo "  count      - Count pages in the compiled PDF"
	@echo "  check      - Check log file for errors and warnings"
	@echo "  help       - Display this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make           # Build the PDF"
	@echo "  make draft     # Quick build for draft"
	@echo "  make clean     # Clean up auxiliary files"
	@echo "  make view      # Open the PDF"
