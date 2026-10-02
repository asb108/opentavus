"""Export the canonical Python boundary models as JSON Schema."""

import argparse
import json
from pathlib import Path

from opentavus_core.schema import ContractBundle


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    path = Path(__file__).resolve().parents[1] / "packages/contracts/schema.json"
    schema = ContractBundle.model_json_schema()
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    content = json.dumps(schema, indent=2, sort_keys=True) + "\n"
    if arguments.check:
        if not path.is_file() or path.read_text() != content:
            parser.exit(1, "Contract JSON Schema is stale; run npm run contracts:generate.\n")
        print("Contract JSON Schema matches the Python models.")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        print("Generated packages/contracts/schema.json.")


if __name__ == "__main__":
    main()
