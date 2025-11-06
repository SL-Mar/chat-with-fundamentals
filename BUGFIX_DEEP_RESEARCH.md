# Bug Fix: Deep Research Feature

## Issue
Deep research feature was failing with the error:
```
AttributeError: type object 'AgentStatus' has no attribute 'INFO'
```

## Root Cause
In `backend/services/gpt_researcher_service.py`, the code was trying to use `AgentStatus.INFO` which doesn't exist in the `AgentStatus` enum.

The `AgentStatus` enum (defined in `backend/services/marketsense/types.py`) only has these values:
- `PENDING = "pending"`
- `RUNNING = "running"`
- `SUCCESS = "success"`
- `ERROR = "error"`

## Fix Applied
**File:** `backend/services/gpt_researcher_service.py` (lines 47-56)

**Before:**
```python
status_map = {
    'running': AgentStatus.RUNNING,
    'success': AgentStatus.SUCCESS,
    'error': AgentStatus.ERROR,
    'info': AgentStatus.INFO  # ❌ This doesn't exist
}

log_message = AgentLogMessage(
    agent='gpt_researcher',
    status=status_map.get(status, AgentStatus.INFO),  # ❌ Default also wrong
```

**After:**
```python
status_map = {
    'running': AgentStatus.RUNNING,
    'success': AgentStatus.SUCCESS,
    'error': AgentStatus.ERROR,
    'info': AgentStatus.RUNNING  # ✅ Use RUNNING for informational messages
}

log_message = AgentLogMessage(
    agent='gpt_researcher',
    status=status_map.get(status, AgentStatus.RUNNING),  # ✅ Default to RUNNING
```

## Testing
The deep research feature should now work correctly. You can test it by:

1. Navigate to any stock page (e.g., `/stocks/MU.US`)
2. Go to the "Deep Research" tab
3. Enter a research query (e.g., "What are the growth prospects for Micron Technology?")
4. Click "Generate Report"

The feature should now generate research reports without errors.

## Backend Server
Backend server restarted and confirmed running on `http://localhost:8000`
