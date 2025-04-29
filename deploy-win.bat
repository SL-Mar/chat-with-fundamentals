@echo off
echo Setting up environment...

:: Create virtual environment
python -m venv venv
call venv\Scripts\activate

:: Install dependencies
pip install -r requirements.txt

:: Copy .env.model to .env if needed
if not exist ".env" (
    copy .env.model .env
    echo .env file created. Please update your keys.
)

:: Optional: Run dev server
:: uvicorn main:app --reload
