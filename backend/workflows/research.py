from gpt_researcher import GPTResearcher
from tools.prompt_helpers import build_financial_research_prompt
from models.research_models import AcademicResponse, Paper
import datetime as dt
import aiohttp

async def is_valid_url(url: str) -> bool:
    if not url:
        return False
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(url, timeout=5) as response:
                return response.status < 400
    except Exception:
        return False

async def run_research_flow_async(query: str, *, max_papers: int = 5) -> AcademicResponse:
    custom_prompt = build_financial_research_prompt(query)

    researcher = GPTResearcher(
        query=custom_prompt,
        report_type="deep",
        config_path="core/research_config.json",
        verbose = False
    )

    await researcher.conduct_research()
    # await researcher.summarize_sources()  # improves source metadata before writing
    report_md = await researcher.write_report()

    all_sources = researcher.get_research_sources()
    costs = float(researcher.get_costs()) if researcher.get_costs() else None
    context = researcher.get_research_context()
    images = researcher.get_research_images()

    # Filter broken links
    valid_sources = []
    for src in all_sources:
        url = src.get("url")
        if await is_valid_url(url):
            valid_sources.append(src)
        # Optional: else log or track discarded links

    papers: list[Paper] = []
    for s in valid_sources[:max_papers]:
        papers.append(Paper(
            source=s.get("source", "GPT_RESEARCHER"),
            title=s.get("title", "Untitled"),
            authors=s.get("authors", []),
            published=s.get("published", dt.datetime.utcnow()),
            summary=s.get("content", "")[:2000],
            url=s.get("url"),
            image_url=s.get("image")
        ))

    # Fallback if no valid sources
    if not papers:
        papers = [Paper(
            source="GPT_RESEARCHER",
            title=f"GPT‑Researcher Report: {query}",
            authors=[],
            published=dt.datetime.utcnow(),
            summary=report_md[:2000],
            url=None
        )]

    return AcademicResponse(
        papers=papers,
        full_report=report_md,
        metadata={
            "costs": costs,
            "context": context,
            "images": images
        }
    )
