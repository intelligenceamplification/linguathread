import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
const source = await readFile(new URL("../app/speech.ts", import.meta.url), "utf8");
const compiledModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: compiledModule.exports, module: compiledModule });
const speech = compiledModule.exports;

test("every offered language has a specific speech locale", async () => {
 const foundationSource = await readFile(new URL("../app/multilingual-foundation.ts", import.meta.url), "utf8");
 const foundationModule = { exports: {} };
 vm.runInNewContext(ts.transpileModule(foundationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: foundationModule.exports, module: foundationModule });
 assert.deepEqual(Object.keys(speech.speechLocales).sort(), Array.from(foundationModule.exports.foundationLanguages, language => language.id).sort());
 for (const locale of Object.values(speech.speechLocales)) assert.match(locale, /^[a-z]{2}-[A-Z]{2}$/);
});

test("voice selection prefers exact locale then language family", () => {
 const voices = [{ lang: "en-GB" }, { lang: "es-MX" }, { lang: "es-ES" }];
 assert.equal(speech.voiceForLanguage(voices, "es"), voices[2]);
 assert.equal(speech.voiceForLanguage(voices, "en"), voices[0]);
});
