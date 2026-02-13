FROM python:3.12-slim

RUN pip install --no-cache-dir \
    pandas numpy scikit-learn xgboost lightgbm \
    matplotlib seaborn statsmodels scipy \
    psycopg2-binary

RUN mkdir -p /workspace/output
WORKDIR /workspace

# Non-root user for security
RUN useradd -m sandbox
USER sandbox
