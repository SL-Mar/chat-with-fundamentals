# Quantitative Methods Monograph

This directory contains the LaTeX source for the comprehensive technical monograph documenting all quantitative methods used in the Chat with Fundamentals platform.

## Document Structure

```
docs/monograph/
├── main.tex                    # Main document (Springer template)
├── chapter01_time_series.tex   # Chapter 1: Time Series Analysis
├── chapter02_volatility.tex    # Chapter 2: Volatility Modeling (TODO)
├── chapter03_performance.tex   # Chapter 3: Risk-Adjusted Performance (TODO)
├── ...                         # Additional chapters (TODO)
├── figures/                    # Figures and diagrams
└── README.md                   # This file
```

## Building the Document

### Requirements

- **LaTeX Distribution**: TeX Live 2023+ or MikTeX
- **Required Packages**:
  - `svmono` (Springer Monograph class)
  - `amsmath`, `amssymb`, `amsfonts`
  - `tikz`, `pgfplots`
  - `listings`, `xcolor`
  - `algorithm`, `algpseudocode`
  - `hyperref`, `url`

### Installation

**Ubuntu/Debian:**
```bash
sudo apt-get install texlive-full
```

**macOS (Homebrew):**
```bash
brew install --cask mactex
```

**Windows:**
Download and install [MikTeX](https://miktex.org/download) or [TeX Live](https://www.tug.org/texlive/windows.html)

### Springer Template

The document uses the Springer Monograph class (`svmono`). If not included in your distribution:

```bash
# Download from CTAN
wget https://ctan.org/tex-archive/macros/latex/contrib/springer/svmono.zip
unzip svmono.zip
cp svmono/*.cls .
```

### Compilation

**Method 1: Using pdflatex (recommended)**
```bash
cd docs/monograph
pdflatex main.tex
pdflatex main.tex  # Run twice for cross-references
makeindex main.idx
pdflatex main.tex  # Final run with index
```

**Method 2: Using latexmk (automatic)**
```bash
latexmk -pdf main.tex
```

**Method 3: Using Makefile**
```bash
make          # Build PDF
make clean    # Remove auxiliary files
make distclean # Remove all generated files
```

### Output

The compiled PDF will be: `main.pdf`

## Current Status

### Completed Chapters

- ✅ **Chapter 1: Time Series Analysis**
  - Return calculation methods (simple, log, multi-period)
  - Statistical properties of returns (mean, variance, autocorrelation)
  - Stationarity testing (ADF test)
  - Database architecture (PostgreSQL + TimescaleDB)
  - Data validation and cleaning

### In Progress

- 🚧 **Chapter 2: Volatility Modeling** (planned)
  - Historical volatility
  - EWMA (λ=0.94)
  - Extreme Value Theory (VaR, CVaR)

- 🚧 **Chapter 3: Risk-Adjusted Performance Metrics** (planned)
  - Sharpe Ratio
  - Sortino Ratio
  - Maximum Drawdown
  - Calmar Ratio

### Planned Chapters

See `QUANTITATIVE_METHODS_MONOGRAPH_TOC.md` in the root directory for the complete table of contents.

## Document Specifications

- **Template**: Springer Monograph (`svmono` class)
- **Font**: Times (text), Helvetica (sans-serif), Courier (typewriter)
- **Page Size**: A4 / Letter (configurable)
- **Estimated Length**: 200-250 pages (when complete)
- **Code Listings**: Python and SQL with syntax highlighting
- **Figures**: TikZ/PGFPlots for diagrams and plots

## Contributing

### Adding New Chapters

1. Create `chapterXX_title.tex` in this directory
2. Add `\include{chapterXX_title}` to `main.tex` in the appropriate Part
3. Follow the structure of Chapter 1:
   - Abstract
   - Introduction
   - Main sections with mathematical equations
   - Code listings with implementation
   - Summary
   - References

### Style Guidelines

- **Equations**: Use `equation` environment with `\label{eq:name}`
- **Code**: Use `lstlisting` environment with caption and label
- **Figures**: Use TikZ for diagrams, place in `figures/` directory
- **Tables**: Use `booktabs` package for professional tables
- **References**: BibTeX entries at end of each chapter
- **Cross-references**: Use `\ref{}` and `\eqref{}` for equations

### Mathematical Notation

- Returns: $R_t$ (simple), $r_t$ (log)
- Price: $P_t$
- Mean: $\mu$ or $\bar{R}$
- Volatility: $\sigma$
- Time index: $t$, $T$ (total periods)
- Vectors: Bold lowercase ($\mathbf{w}$ for weights)
- Matrices: Bold uppercase ($\mathbf{\Sigma}$ for covariance)

## License

This document is part of the Chat with Fundamentals project.
See the main repository LICENSE for details.

## References

- Springer LaTeX Guidelines: https://www.springer.com/gp/authors-editors/book-authors-editors/manuscript-preparation/5636
- CTAN svmono package: https://ctan.org/pkg/springer
- TimescaleDB Documentation: https://docs.timescale.com/
