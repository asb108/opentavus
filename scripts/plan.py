#!/usr/bin/env python3
"""Validate and render the contribution plan using only the standard library."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
TASKS = ROOT / "docs/tasks.json"
ROADMAP = ROOT / "docs/roadmap.md"
STATUSES = ("todo", "in_progress", "blocked", "done")
IGNORED_DIRECTORIES = {
    ".git", ".venv", ".cache", "__pycache__", "node_modules", "artifacts", "models",
}
REQUIRED_DOCUMENTS = (
    "README.md", "AGENTS.md", "CONTRIBUTING.md", "LICENSE", "Makefile",
    "docs/design.md", "docs/decisions.md", "docs/plugin-contract.md",
    "docs/quality.md", "docs/plan-review.md", ".github/PULL_REQUEST_TEMPLATE.md",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def nonempty(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def string_list(value: object, label: str, *, allow_empty: bool = False) -> None:
    require(isinstance(value, list), f"{label} must be a list")
    require(allow_empty or bool(value), f"{label} must not be empty")
    require(all(nonempty(item) for item in value), f"{label} must contain nonempty strings")


def validate_plan(plan: object) -> None:
    require(isinstance(plan, dict), "Plan must be a JSON object")
    require(type(plan.get("schema_version")) is int and plan["schema_version"] == 1,
            "Unsupported plan schema_version; expected 1")
    require(nonempty(plan.get("release_goal")), "Plan needs a release_goal")
    milestones = plan.get("milestones")
    require(isinstance(milestones, list) and bool(milestones), "Plan needs milestones")
    milestone_ids: set[str] = set()
    for milestone in milestones:
        require(isinstance(milestone, dict), "Each milestone must be an object")
        milestone_id = milestone.get("id")
        require(isinstance(milestone_id, str) and bool(re.fullmatch(r"G\d+", milestone_id)),
                "Milestone IDs must match G<number>")
        require(milestone_id not in milestone_ids, f"Duplicate milestone {milestone_id}")
        require(nonempty(milestone.get("title")), f"{milestone_id} needs a title")
        milestone_ids.add(milestone_id)

    tasks = plan.get("tasks")
    require(isinstance(tasks, list) and bool(tasks), "Plan needs tasks")
    by_id: dict[str, dict] = {}
    for task in tasks:
        require(isinstance(task, dict), "Each task must be an object")
        task_id = task.get("id")
        require(isinstance(task_id, str) and bool(re.fullmatch(r"T\d{2,}", task_id)),
                "Task IDs must match T<number> with at least two digits")
        require(task_id not in by_id, f"Duplicate task {task_id}")
        for field in ("title", "outcome"):
            require(nonempty(task.get(field)), f"{task_id} needs {field}")
        require(isinstance(task.get("milestone"), str)
                and task["milestone"] in milestone_ids, f"{task_id} has an unknown milestone")
        require(task.get("status") in STATUSES, f"{task_id} has an invalid status")
        require("owner" in task and (task["owner"] is None or nonempty(task["owner"])),
                f"{task_id} owner must be null or a nonempty assignment")
        require(task["status"] != "in_progress" or nonempty(task["owner"]),
                f"{task_id} in_progress needs an owner")
        for field in ("depends_on", "owns", "acceptance", "evidence"):
            string_list(task.get(field), f"{task_id}.{field}",
                        allow_empty=field in ("depends_on", "evidence"))
        require(len(task["depends_on"]) == len(set(task["depends_on"])),
                f"{task_id} has duplicate dependencies")
        for path in task["owns"]:
            proposed_path = PurePosixPath(path)
            require(not proposed_path.is_absolute() and ".." not in proposed_path.parts
                    and proposed_path.parts and ":" not in path and "\\" not in path,
                    f"{task_id} owns must use repository-relative paths: {path}")
        require("blocker" in task and (task["blocker"] is None or nonempty(task["blocker"])),
                f"{task_id} blocker must be null or a nonempty explanation")
        require(task["status"] != "blocked" or nonempty(task["blocker"]),
                f"{task_id} blocked needs an exact blocker")
        require(task["status"] == "blocked" or task["blocker"] is None,
                f"{task_id} has a blocker but is not blocked")
        require(task["status"] != "done" or bool(task["evidence"]),
                f"{task_id} done needs completion evidence")
        by_id[task_id] = task

    for task_id, task in by_id.items():
        for dependency in task["depends_on"]:
            require(dependency in by_id, f"{task_id} has unknown dependency {dependency}")
            require(dependency != task_id, f"{task_id} cannot depend on itself")

    visited: set[str] = set()

    def visit(task_id: str, trail: list[str]) -> None:
        require(task_id not in trail, f"Dependency cycle: {' -> '.join(trail + [task_id])}")
        if task_id in visited:
            return
        for dependency in by_id[task_id]["depends_on"]:
            visit(dependency, trail + [task_id])
        visited.add(task_id)

    for task_id in by_id:
        visit(task_id, [])
    for task_id, task in by_id.items():
        if task["status"] == "done":
            unfinished = [dep for dep in task["depends_on"] if by_id[dep]["status"] != "done"]
            require(not unfinished, f"{task_id} done has unfinished dependencies: {unfinished}")


def load_plan() -> dict:
    plan = json.loads(TASKS.read_text(encoding="utf-8"))
    validate_plan(plan)
    return plan


def ready_tasks(plan: dict) -> list[dict]:
    by_id = {task["id"]: task for task in plan["tasks"]}
    return [task for task in plan["tasks"]
            if task["status"] == "todo" and task["owner"] is None
            and all(by_id[dep]["status"] == "done" for dep in task["depends_on"])]


def table_text(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def render_roadmap(plan: dict) -> str:
    lines = [
        "# Implementation roadmap", "",
        "Generated from [tasks.json](tasks.json) by `make plan-render`. Edit the task source, not this file.",
        "", plan["release_goal"], "",
        "Only T00 is the planning foundation. Application paths below are proposed until their tasks create them. "
        "Task status and recorded evidence do not automatically establish real-model performance or publication.",
        "", "## Execution order", "",
        "Complete T00, then start T01 (measured feasibility) and T02 (typed scaffold). "
        "T09 supplies the early fixture harness after T02. T03 establishes the complete voice slice; "
        "T04 makes its timing and cancellation reliable. T05 adds the stock avatar. "
        "T07 and T08 implement the picker and canvas through the shared contracts. "
        "T06 isolates LAM; T10 separately evaluates the GPU portrait candidate.",
        "",
        "After dependencies are met, distinct owners can work on separate responsibilities. "
        "Coordinate shared contracts rather than editing the same paths concurrently. "
        "T12 packages the working profiles, and T13 proves all three launch experiences. "
        "T10/T11 are optional portrait/network work, not prerequisites to the local base release; "
        "advertising those paths requires their own evidence. "
        "T14-T17 retain the studio, broader tools/vision, video exports, and scale work for later.",
        "",
        "Keep spikes bounded: choose the named candidate, measure a complete slice, and compare an alternative "
        "only when a concrete failure justifies it. Do not grow the framework or model catalog before the launch behavior works.",
        "", "## Task summary", "",
        "| Task | Milestone | Status | Dependencies | Assigned owner |",
        "| --- | --- | --- | --- | --- |",
    ]
    for task in plan["tasks"]:
        dependencies = ", ".join(task["depends_on"]) or "None"
        owner = table_text(task["owner"] or "Unassigned")
        lines.append(f"| [{task['id']}](#{task['id'].lower()}) | {task['milestone']} | "
                     f"{task['status']} | {dependencies} | {owner} |")
    ready = ", ".join(task["id"] for task in ready_tasks(plan)) or "None"
    lines.extend([
        "", f"**Ready to claim now:** {ready}. Run `make plan-status` after changing task status.",
        "", "## Task details", "",
        "Read [the design](design.md), [plugin contract](plugin-contract.md), and "
        "[quality gates](quality.md) for the corresponding boundary. "
        "Acceptance criteria require human review of their evidence; the plan verifier checks structure and consistency.",
    ])
    for milestone in plan["milestones"]:
        lines.extend(["", f"### {milestone['id']} - {milestone['title']}"])
        for task in plan["tasks"]:
            if task["milestone"] != milestone["id"]:
                continue
            dependencies = ", ".join(task["depends_on"]) or "None"
            lines.extend([
                "", f"<a id=\"{task['id'].lower()}\"></a>", "",
                f"#### {task['id']}: {task['title']}", "",
                f"Status: **{task['status']}**. Owner: {task['owner'] or 'Unassigned'}. "
                f"Dependencies: {dependencies}.", "", task["outcome"], "",
                "Owned paths (proposed responsibilities, not an existence check):", "",
            ])
            lines.extend(f"- `{path}`" for path in task["owns"])
            lines.extend(["", "Acceptance:", ""])
            lines.extend(f"- {criterion}" for criterion in task["acceptance"])
            lines.extend(["", "Evidence:", ""])
            lines.extend(f"- {item}" for item in task["evidence"])
            if not task["evidence"]:
                lines.append("- Not recorded; acceptance is unverified.")
            if task["blocker"]:
                lines.extend(["", f"Blocker: {task['blocker']}"])
    return "\n".join(lines) + "\n"


def check_document_links(root: Path) -> int:
    for relative_path in REQUIRED_DOCUMENTS:
        require((root / relative_path).is_file(), f"Missing planning document: {relative_path}")
    checked = 0
    # Inline local links are checked; external URLs and heading anchors are not fetched.
    link_pattern = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")
    for directory, subdirectories, files in os.walk(root):
        subdirectories[:] = [name for name in subdirectories if name not in IGNORED_DIRECTORIES]
        for filename in files:
            if not filename.endswith(".md"):
                continue
            document = Path(directory) / filename
            for raw_target in link_pattern.findall(document.read_text(encoding="utf-8")):
                target = raw_target.strip()
                if target.startswith("<"):
                    target = target.split(">", 1)[0][1:]
                else:
                    target = target.split(" ", 1)[0]
                parsed = urlsplit(target)
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                resolved = (document.parent / unquote(parsed.path)).resolve()
                require(resolved.is_relative_to(root.resolve()),
                        f"Local link leaves repository: {document.relative_to(root)} -> {target}")
                require(resolved.exists(),
                        f"Broken local link: {document.relative_to(root)} -> {target}")
                checked += 1
    return checked


def print_status(plan: dict) -> None:
    counts = {status: sum(task["status"] == status for task in plan["tasks"]) for status in STATUSES}
    print("Tasks: " + ", ".join(f"{status}={counts[status]}" for status in STATUSES))
    ready = ready_tasks(plan)
    print("Ready to claim:")
    for task in ready:
        print(f"  {task['id']}: {task['title']}")
    if not ready:
        print("  None; inspect active tasks and their dependencies.")
    for task in plan["tasks"]:
        if task["status"] in ("in_progress", "blocked"):
            detail = task["blocker"] or task["owner"]
            print(f"{task['status']}: {task['id']} - {detail}")
    print("Planning artifacts only; application performance is unmeasured.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("status", "render", "check"))
    arguments = parser.parse_args()
    try:
        plan = load_plan()
        if arguments.command == "status":
            print_status(plan)
        elif arguments.command == "render":
            ROADMAP.write_text(render_roadmap(plan), encoding="utf-8")
            print("Generated docs/roadmap.md from docs/tasks.json.")
        else:
            require(ROADMAP.is_file(), "Missing docs/roadmap.md; run make plan-render")
            require(ROADMAP.read_text(encoding="utf-8") == render_roadmap(plan),
                    "Roadmap is stale; run make plan-render")
            links = check_document_links(ROOT)
            print(f"Plan check passed: {len(plan['tasks'])} tasks, acyclic dependencies, "
                  f"completion consistency, generated roadmap, {links} local links.")
            print("Acceptance evidence requires review; model/browser/GPU behavior is not checked here.")
    except (OSError, ValueError, RecursionError) as error:
        print(f"Plan check failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
