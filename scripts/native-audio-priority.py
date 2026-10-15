"""Order work by authored progression; never remove required utterances."""
def prioritize(items, inventory, lessons):
    order = {lesson["id"]: i for i, lesson in enumerate(lessons)}
    anchor = inventory.get("scope", {}).get("anchorLessonId") or inventory.get("priorityAnchorLessonId")
    start = order.get(anchor, 0)
    sources = {(item["language"], item["text"]): item["sources"] for item in inventory["items"]}

    def rank(item):
        authored = sources.get((item["language"], item["text"]), [])
        positions = [order[source.split(":", 1)[0]] for source in authored if source.split(":", 1)[0] in order]
        forward = [position for position in positions if position >= start]
        # Current and upcoming lesson controls precede isolated writing samples.
        return (0, min(forward) - start, len(item["text"])) if forward else (1, min(positions, default=len(order)), len(item["text"]))

    return sorted(items, key=rank)
