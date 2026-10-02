"""Generate the alpha control request/response schema without loading models."""

import argparse
import json
from pathlib import Path

from opentavus_api.models import CallCreated, CallSettings, Hello, Offer, Question, TeachMode
from opentavus_core.schema import Boundary
from opentavus_runtime.tools import BoardReply


class ControlContract(Boundary):
    settings: CallSettings
    created: CallCreated
    hello: Hello
    offer: Offer
    question: Question
    teach_mode: TeachMode
    board: BoardReply


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / "packages/contracts/api.schema.json"
    content = json.dumps(ControlContract.model_json_schema(), indent=2, sort_keys=True) + "\n"
    if args.check:
        if target.read_text() != content:
            parser.exit(1, "Control schema is stale; run npm run contracts:generate.\n")
    else:
        target.write_text(content)


if __name__ == "__main__":
    main()
