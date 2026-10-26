"""Paquete núcleo del NEXUS Engineering Intelligence Platform."""

from .domain import (  # noqa: F401
    MAX_ATTEMPTS,
    STATUSES,
    TRANSITIONS,
    Checkpoint,
    Finding,
    KnowledgeSource,
    PolicyError,
    Sprint,
    Task,
    TransitionError,
    new_id,
    utcnow,
)
from .orchestrator import Orchestrator, run_command  # noqa: F401
from .policy import Policy  # noqa: F401
from .store import StateStore  # noqa: F401

__all__ = [
    "MAX_ATTEMPTS",
    "STATUSES",
    "TRANSITIONS",
    "Checkpoint",
    "Finding",
    "KnowledgeSource",
    "Orchestrator",
    "Policy",
    "PolicyError",
    "Sprint",
    "StateStore",
    "Task",
    "TransitionError",
    "new_id",
    "run_command",
    "utcnow",
]
__version__ = "1.0.0"
