import test from "node:test";
import assert from "node:assert/strict";
import { spokenText } from "../app/spoken-text.ts";

test("spoken alternatives omit slash symbols while preserving accents", () => {
  for (const text of ["Mình / Tôi", "Mình/Tôi", "Mình ／ Tôi"]) {
    assert.equal(spokenText(text), "Mình, Tôi");
  }
  assert.equal(spokenText("tú · él"), "tú, él");
  assert.equal(spokenText("Bây giờ tôi có thể diễn đạt tự tin hơn."), "Bây giờ tôi có thể diễn đạt tự tin hơn.");
});
