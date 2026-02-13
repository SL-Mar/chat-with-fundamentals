"""Docker-based code execution sandbox."""

import asyncio
import base64
import logging
import os
import tempfile
import time
from pathlib import Path

from .models import ExecutionResult

logger = logging.getLogger(__name__)

SANDBOX_IMAGE = "cwf-sandbox:latest"
TIMEOUT_SECONDS = 60
MEMORY_LIMIT = "2g"
CPU_LIMIT = "2.0"


async def build_sandbox_image() -> bool:
    """Build the sandbox Docker image if it doesn't exist."""
    dockerfile_dir = Path(__file__).parent
    proc = await asyncio.create_subprocess_exec(
        "docker", "build", "-t", SANDBOX_IMAGE, str(dockerfile_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        logger.error(f"Failed to build sandbox image: {stderr.decode()}")
        return False
    logger.info("Sandbox image built successfully")
    return True


async def execute_code(code: str, db_connection_string: str) -> ExecutionResult:
    """Execute Python code in a Docker sandbox container."""
    start_time = time.time()

    # Rewrite connection string for Docker network:
    # Host sees localhost:5435, but sandbox container must use cwf-db:5432
    sandbox_db_url = db_connection_string.replace("localhost:5435", "cwf-db:5432")

    # Write code to temp file
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, prefix="cwf_"
    ) as f:
        f.write(code)
        code_file = f.name

    # Create temp output directory
    output_dir = tempfile.mkdtemp(prefix="cwf_output_")

    try:
        cmd = [
            "docker", "run", "--rm",
            "--memory", MEMORY_LIMIT,
            "--cpus", CPU_LIMIT,
            "--network", "chat-with-fundamentals_default",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=100m",
            "-e", f"DB_CONNECTION_STRING={sandbox_db_url}",
            "-v", f"{code_file}:/workspace/script.py:ro",
            "-v", f"{output_dir}:/workspace/output:rw",
            SANDBOX_IMAGE,
            "python", "/workspace/script.py",
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return ExecutionResult(
                success=False,
                error=f"Execution timed out after {TIMEOUT_SECONDS}s",
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

        execution_time_ms = int((time.time() - start_time) * 1000)

        # Collect artifacts (PNG files from output dir)
        artifacts = []
        for f in Path(output_dir).glob("*.png"):
            with open(f, "rb") as img:
                artifacts.append({
                    "name": f.name,
                    "base64": base64.b64encode(img.read()).decode(),
                    "mime_type": "image/png",
                })

        return ExecutionResult(
            success=proc.returncode == 0,
            stdout=stdout.decode()[:50000],
            stderr=stderr.decode()[:10000],
            artifacts=artifacts,
            execution_time_ms=execution_time_ms,
            error=stderr.decode()[:2000] if proc.returncode != 0 else None,
        )

    finally:
        os.unlink(code_file)
        # Clean up output dir
        import shutil
        shutil.rmtree(output_dir, ignore_errors=True)
