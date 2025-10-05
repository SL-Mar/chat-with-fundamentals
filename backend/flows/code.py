# flows/code.py – v1.1 - inherits from legacy v0.3

import os
import re
import json
import pprint
from typing import Optional

from crewai import Crew, Task, Process
from crewai.flow.flow import Flow, start
from pydantic import BaseModel, ValidationError

from models.code_models import SummaryResponse, GeneratedCode
from core.llm_provider import get_llm
from core.logger_config import setup_logger

from agents.extract_agents import pdf_analysis_agent
from agents.code_agents import summary_generator_agent, code_generator_agent, code_validator_agent, code_refinement_agent

logger = setup_logger().getChild("coding_flow")
logger.info("[FLOW] Initializing PDF-to-QuantConnect flow")

class CodingState(BaseModel):
    result: Optional[GeneratedCode] = None

class CodingFlow(Flow[CodingState]):
    """
    Refactored version of the legacy script pipeline using CrewAI.
    Parses a PDF to extract sections, synthesize a summary, and produce QuantConnect code.
    """

    @start()
    def run_crew(self) -> GeneratedCode:
        pdf_path = self.inputs.get("pdf_path")
        if not pdf_path:
            raise ValueError("CodingFlow requires 'pdf_path' input")
        logger.info(f"[CODING_FLOW] Starting pipeline for: {pdf_path}")

        # 1️⃣ Extract structured sections
        extract_task = Task(
            description=f"Extract structured sections from PDF: {pdf_path}",
            expected_output="List of sections with heading, text, position, and type_hint",
            agent=pdf_analysis_agent
        )

        # 2️⃣ Summarize
        summary_task = Task(
            description="Generate a concise summary from extracted sections",
            expected_output="SummaryResponse",
            context=[extract_task],
            output_pydantic=SummaryResponse,
            agent=summary_generator_agent
        )

        # 3️⃣ Generate Code
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        safe_base = re.sub(r"[^A-Za-z0-9_-]", "_", base_name)[:40]
        filename = safe_base + ".py"
        logger.info("[CODING_FLOW] Generating QuantConnect code from summary")
        code_task = Task(
            description=f"Generate QuantConnect Python code from summary. Filename should be: {filename}",
            expected_output="GeneratedCode JSON",
            context=[summary_task],
            output_pydantic=GeneratedCode,
            agent=code_generator_agent
        )

        # 4️⃣ Validate syntax only
        validate_task = Task(
            description="Validate the generated code using Python AST. Return 'ok' or the error.",
            expected_output="'ok' or error message",
            context=[code_task],
            agent=code_validator_agent
        )

        # 5️⃣ Refine if validation failed
        refine_task = Task(
            description="If the previous validation returned an error, fix the QuantConnect code and return the corrected GeneratedCode JSON.",
            expected_output="Validated GeneratedCode JSON",
            context=[code_task, validate_task],
            output_pydantic=GeneratedCode,
            agent=code_refinement_agent
        )

        crew = Crew(
            agents=[
                pdf_analysis_agent,
                summary_generator_agent,
                code_generator_agent,
                code_validator_agent,
                code_refinement_agent
            ],
            tasks=[
                extract_task,
                summary_task,
                code_task,
                validate_task,
                refine_task
            ],
            manager_llm=get_llm(role="manager"),
            process=Process.sequential,
            verbose=True
        )

        logger.info("[CODING_FLOW] Kicking off Crew...")
        raw = crew.kickoff(inputs={"pdf_path": pdf_path})

        try:
            # Clean the raw output to handle control characters
            raw_str = raw.raw
            logger.debug(f"[CODING_FLOW] Raw output length: {len(raw_str)}")

            # Try direct JSON parsing first
            try:
                parsed = json.loads(raw_str)
                self.state.result = GeneratedCode.model_validate(parsed)
            except json.JSONDecodeError as e:
                logger.warning(f"[CODING_FLOW] JSON decode failed: {e}. Attempting cleanup...")
                # If that fails, try cleaning control characters
                clean_str = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f]', '', raw_str)
                parsed = json.loads(clean_str)
                self.state.result = GeneratedCode.model_validate(parsed)

        except (ValidationError, json.JSONDecodeError) as e:
            logger.exception("Validation to GeneratedCode failed")
            logger.error(f"Raw output snippet: {raw.raw[:500]}...")
            raise

        return self.finalize()

    def finalize(self) -> GeneratedCode:
        if self.state.result is None:
            raise ValueError("CodingFlow produced no result")
        logger.info("[CODING_FLOW] Returning finalized result")
        logger.debug(pprint.pformat(self.state.result.model_dump()))
        return self.state.result
