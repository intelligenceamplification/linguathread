"""Select a personal audio window without changing authored lessons or progress."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def scoped_inventory(inventory, curriculum, policy):
    if set(policy["languages"]) != {"es", "vi"} or not 1 <= policy["forwardUnitCount"] <= 4:
        raise ValueError("Use the Spanish/Vietnamese personal window, with 1–4 units")
    anchor = next((l for l in curriculum if l["id"] == policy["anchorLessonId"]), None)
    if not anchor:
        raise ValueError("Active lesson must exist in the published curriculum")
    units = list(dict.fromkeys((l["level"], l["unit"]) for l in curriculum))
    start = units.index((anchor["level"], anchor["unit"]))
    active_units = set(units[start:start + policy["forwardUnitCount"]])
    lesson_ids = {l["id"] for l in curriculum if (l["level"], l["unit"]) in active_units}
    known_ids = {l["id"] for l in curriculum}
    review_ids = set(policy.get("reviewLessonIds", []))
    if not review_ids <= known_ids:
        raise ValueError("Unknown retrieval lesson in personal audio scope")
    lesson_ids |= review_ids
    items = [item for item in inventory["items"] if item["language"] in policy["languages"] and any(source.split(":", 1)[0] in lesson_ids or (policy.get("includeWritingFoundations") and source.split(":", 1)[0] not in known_ids) for source in item["sources"])]
    return dict(inventory, items=items, scope={"kind": "personal-window", "languages": policy["languages"], "anchorLessonId": anchor["id"], "lessonIds": [l["id"] for l in curriculum if l["id"] in lesson_ids], "reviewLessonIds": sorted(review_ids), "includeWritingFoundations": bool(policy.get("includeWritingFoundations")), "unitCount": len(active_units)})


def validate_scope(inventory):
    if not inventory.get("scope"):
        return
    source = ROOT / "audio/inventory-es-vi.json"
    policy = ROOT / "audio/native-personal-scope.json"
    if inventory.get("fullInventorySha256") != hashlib.sha256(source.read_bytes()).hexdigest() or inventory.get("scopePolicySha256") != hashlib.sha256(policy.read_bytes()).hexdigest():
        raise ValueError("Personal audio scope is stale")
    curriculum = json.loads((ROOT / "audio/generated/ios-approved-v1/curriculum.json").read_text())["lessons"]
    expected = scoped_inventory(json.loads(source.read_text()), curriculum, json.loads(policy.read_text()))
    if inventory["items"] != expected["items"] or inventory["scope"] != expected["scope"]:
        raise ValueError("Personal audio scope omits required controls")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--curriculum", type=Path, default=ROOT / "audio/generated/ios-approved-v1/curriculum.json")
    parser.add_argument("--policy", type=Path, default=ROOT / "audio/native-personal-scope.json")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/inventory-native-personal.json")
    args = parser.parse_args()
    source = ROOT / "audio/inventory-es-vi.json"
    inventory = scoped_inventory(json.loads(source.read_text()), json.loads(args.curriculum.read_text())["lessons"], json.loads(args.policy.read_text()))
    inventory["fullInventorySha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
    inventory["scopePolicySha256"] = hashlib.sha256(args.policy.read_bytes()).hexdigest()
    args.output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"lessons": len(inventory["scope"]["lessonIds"]), "texts": len(inventory["items"]), "requiredVariants": sum(2 if x["language"] == "es" else 1 for x in inventory["items"])}))
