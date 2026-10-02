"""Small observable conversation policies, independent of the media framework."""

import re


def should_interrupt(text: str, *, assistant_speaking: bool) -> bool:
    """Avoid treating a short acknowledgment as a correction.

    Examples: while speaking, 'okay' is a backchannel; 'stop' interrupts;
    'actually I meant velocity' interrupts. Explicit browser Stop always wins.
    Contributors can tune the 5-line policy below with replay evidence.
    """
    words = re.findall(r"[a-z]+", text.lower())
    if not words:
        return False
    if not assistant_speaking:
        return True
    return words[0] in {"stop", "wait", "actually", "no"} or len(words) >= 3


def split_phrases(buffer: str, *, final: bool = False, limit: int = 140) -> tuple[list[str], str]:
    """Bound first-phrase latency without splitting short numeric abbreviations."""
    phrases: list[str] = []
    while match := re.search(r"(?<=[.!?])\s+|(?<=[:;])\s+", buffer):
        phrase = buffer[: match.start()].strip()
        buffer = buffer[match.end() :]
        if phrase:
            phrases.append(phrase)
    if len(buffer) > limit and " " in buffer[:limit]:
        boundary = buffer.rfind(" ", 0, limit)
        phrases.append(buffer[:boundary].strip())
        buffer = buffer[boundary:].lstrip()
    if final and buffer.strip():
        phrases.append(buffer.strip())
        buffer = ""
    return phrases, buffer
