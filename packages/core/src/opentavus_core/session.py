"""Pure transition and generation policies; the runtime owns state mutation."""

from .contracts import Generation, SessionState
from .errors import CoreError

TRANSITIONS: dict[SessionState, frozenset[SessionState]] = {
    "created": frozenset({"preparing", "ending", "failed"}),
    "preparing": frozenset({"ready", "ending", "failed"}),
    "ready": frozenset({"active", "ending", "failed"}),
    "active": frozenset({"ending", "failed"}),
    "ending": frozenset({"ended", "failed"}),
    "ended": frozenset(),
    "failed": frozenset({"ending"}),
}


def transition(current: SessionState, target: SessionState) -> SessionState:
    if target not in TRANSITIONS[current]:
        raise CoreError("invalid_transition", f"Cannot move session from {current} to {target}.")
    return target


def next_generation(current: Generation) -> Generation:
    return Generation(current.conversation_id, current.generation_id + 1)


def accepts_output(active: Generation, incoming: Generation) -> bool:
    return active == incoming
