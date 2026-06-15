/*
 * engine.test.js  (run with:  node test/engine.test.js)
 * Loads the classic-script data/engine (they attach to globalThis.RHODES) and
 * asserts correct behaviour for representative personas.
 */
require("../js/data.js");
require("../js/engine.js");
var evaluate = globalThis.RHODES.engine.evaluate;

var pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? "  --> " + detail : "")); }
}
function ids(list) { return list.map(function (p) { return p.poolId; }); }
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  var sa = a.slice().sort().join(","), sb = b.slice().sort().join(",");
  return sa === sb;
}
function schoolCount(rec) {
  return rec.filter(function (p) { return p.type === "school"; }).length;
}

console.log("\nRhodes4Ikamva engine tests\n");

// 1. Joza / Makhanda -> St Andrew's + EC&FS
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2004-05-10",
    degreeByJuly2027: "yes", province: "Eastern Cape", schoolZone: "makhana" });
  console.log("Persona 1: Makhanda (Joza) student");
  check("gate passes", r.gate.passed, JSON.stringify(r.gate.failures));
  check("recommends St Andrew's + EC&FS", sameSet(ids(r.recommended), ["standrews", "ec_fs"]), ids(r.recommended).join(","));
  check("disclaimer flagged (School pool)", r.needsDisclaimer === true);
  check("max 2 pools", r.recommended.length <= 2);
})();

// 2. Kayamandi / Stellenbosch -> Paul Roos + WC&NC
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2003-03-03",
    degreeByJuly2027: "yes", province: "Western Cape", schoolZone: "cape_winelands" });
  console.log("Persona 2: Stellenbosch (Kayamandi) student");
  check("recommends Paul Roos + WC&NC", sameSet(ids(r.recommended), ["paulroos", "wc_nc"]), ids(r.recommended).join(","));
})();

// 3. UCT alum from Khayelitsha -> SACS + WC&NC
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2002-12-01",
    degreeByJuly2027: "yes", province: "Western Cape", university: "University of Cape Town (UCT)" });
  console.log("Persona 3: UCT graduate from Khayelitsha");
  check("standard age ok (born Dec 2002)", r.gate.passed && r.gate.ageReason === "standard");
  check("recommends SACS + WC&NC", sameSet(ids(r.recommended), ["sacs", "wc_nc"]), ids(r.recommended).join(","));
})();

// 4. Gauteng learner, no School trigger -> GLMN only
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2005-01-01",
    degreeByJuly2027: "yes", province: "Gauteng" });
  console.log("Persona 4: Gauteng learner (no School link)");
  check("recommends GLMN only", sameSet(ids(r.recommended), ["glmn"]), ids(r.recommended).join(","));
  check("no disclaimer", r.needsDisclaimer === false);
})();

// 5. Namibian citizen -> BLMNS only (short-circuit; province ignored)
(function () {
  var r = evaluate({ citizenship: "Namibia", residency5of10: true, dob: "2004-01-01",
    degreeByJuly2027: "yes", province: "Gauteng", university: "University of Cape Town (UCT)" });
  console.log("Persona 5: Namibian citizen");
  check("recommends BLMNS only", sameSet(ids(r.recommended), ["blmns"]), ids(r.recommended).join(","));
  check("BLMNS not combined with anything", r.recommended.length === 1);
})();

// 6. Too young -> gated out
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2010-01-01",
    degreeByJuly2027: "yes", province: "Gauteng" });
  console.log("Persona 6: 15-year-old");
  check("gate fails (too young)", !r.gate.passed && r.gate.ageReason === "tooyoung");
  check("no pools recommended", r.recommended.length === 0);
})();

// 7. No degree by July 2027 -> gated out
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2004-01-01",
    degreeByJuly2027: "no", province: "Gauteng" });
  console.log("Persona 7: No undergraduate degree yet");
  check("gate fails on degree", !r.gate.passed && r.gate.failures.some(function (f) { return f.criterion === "Undergraduate degree"; }));
})();

// 8. Non-eligible citizenship -> gated out
(function () {
  var r = evaluate({ citizenship: "none", residency5of10: true, dob: "2004-01-01",
    degreeByJuly2027: "yes", province: "Gauteng" });
  console.log("Persona 8: Not a Southern African citizen");
  check("gate fails on citizenship", !r.gate.passed && r.gate.failures.some(function (f) { return f.criterion === "Citizenship"; }));
})();

// 9. Past standard age, no extended route -> gated out
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2000-06-01",
    degreeByJuly2027: "yes", province: "Gauteng", lateCompletion: false, medical: false });
  console.log("Persona 9: 27, no late-degree/medical route");
  check("gate fails (needs a route)", !r.gate.passed && r.gate.ageReason === "needsroute");
})();

// 10. Extended via late completion -> passes
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2001-06-01",
    degreeByJuly2027: "yes", province: "Gauteng", lateCompletion: true });
  console.log("Persona 10: Late first degree (extended age route)");
  check("gate passes (extended)", r.gate.passed && r.gate.ageReason === "extended");
  check("recommends GLMN", sameSet(ids(r.recommended), ["glmn"]));
})();

// 11. Two School matches -> only one School pool recommended, other is "also eligible"
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2003-01-01",
    degreeByJuly2027: "yes", province: "Eastern Cape",
    partnerSchool: "St Andrew's College", university: "University of Cape Town (UCT)" });
  console.log("Persona 11: St Andrew's College matric + UCT graduate");
  check("recommends exactly one School pool", schoolCount(r.recommended) === 1, "schools=" + schoolCount(r.recommended));
  check("best School is St Andrew's (named > university)", ids(r.recommended).indexOf("standrews") !== -1);
  check("SACS listed as also-eligible", r.alsoEligible.some(function (p) { return p.poolId === "sacs"; }));
  check("verify note about one-School-pool rule", r.verifyNotes.some(function (n) { return /only ONE School pool/i.test(n); }));
})();

// 12. Not sure of district -> verify note, region baseline still given
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2004-01-01",
    degreeByJuly2027: "yes", province: "Western Cape", schoolZone: "notsure" });
  console.log("Persona 12: Unsure of education district");
  check("still recommends WC&NC baseline", sameSet(ids(r.recommended), ["wc_nc"]));
  check("verify note present", r.verifyNotes.length > 0);
})();

// 13. Nyanga branch inference -> Bishops + WC&NC, with a "confirm" verify note
(function () {
  var r = evaluate({ citizenship: "South Africa", residency5of10: true, dob: "2004-02-02",
    degreeByJuly2027: "yes", province: "Western Cape", branch: "Nyanga",
    schoolZone: "metro_south", schoolFromBranch: true });
  console.log("Persona 13: Nyanga branch (Metro South -> Bishops, inferred)");
  check("recommends Bishops + WC&NC", sameSet(ids(r.recommended), ["bishops", "wc_nc"]), ids(r.recommended).join(","));
  check("adds a branch-area confirm note", r.verifyNotes.some(function (n) { return /branch's area/i.test(n); }));
})();

// Global invariants across a sweep
(function () {
  console.log("Invariants");
  var samples = [
    { citizenship: "South Africa", residency5of10: true, dob: "2003-01-01", degreeByJuly2027: "yes", province: "Western Cape", partnerSchool: "Diocesan College (Bishops)", university: "University of Cape Town (UCT)", schoolZone: "cape_winelands" }
  ];
  samples.forEach(function (a) {
    var r = evaluate(a);
    check("never recommends >2 pools", r.recommended.length <= 2);
    check("never recommends 2 School pools", schoolCount(r.recommended) <= 1);
  });
})();

console.log("\n" + pass + " passed, " + fail + " failed\n");
process.exit(fail === 0 ? 0 : 1);
