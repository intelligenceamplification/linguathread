// Letter names: https://www.rae.es/espanol-al-dia/un-solo-nombre-para-cada-letra
const spanishNames: Record<string, string> = {
  a: "a", b: "be", c: "ce", d: "de", e: "e", f: "efe", g: "ge", h: "hache", i: "i",
  j: "jota", k: "ka", l: "ele", m: "eme", n: "ene", ñ: "eñe", o: "o", p: "pe", q: "cu",
  r: "erre", s: "ese", t: "te", u: "u", v: "uve", w: "uve doble", x: "equis", y: "ye", z: "zeta",
  á: "a con tilde", é: "e con tilde", í: "i con tilde", ó: "o con tilde", ú: "u con tilde", ü: "u con diéresis",
};

export function spanishLetterAudio(form: string) {
  const key = form.normalize("NFC").toLocaleLowerCase("es");
  const name = spanishNames[key];
  // Keep the reviewed standalone de model. Other letter names use a complete
  // teaching cue, which is shown as the audio model rather than extra speech.
  return !name ? form : key === "d" ? name : `Esta es la letra ${name}.`;
}
