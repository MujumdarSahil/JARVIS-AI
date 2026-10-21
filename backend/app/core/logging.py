import logging
import sys
from backend.app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configures structured, clean logging without exposing sensitive data."""
    level = getattr(logging, settings.api_log_level.upper(), logging.INFO)
    log_format = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    
    logging.basicConfig(
        level=level,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    
    # Suppress verbose third-party loggers if necessary
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)

    logger = logging.getLogger("jarvis")
    logger.setLevel(level)
    return logger


logger = setup_logging()
