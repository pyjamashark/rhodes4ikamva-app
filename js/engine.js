/*
 * engine.js — pure eligibility logic. No DOM. Consumes RHODES.DATA.
 *
 * evaluate(answers) -> {
 *   gate:        { passed, failures:[{criterion,message}], warnings:[...] },
 *   recommended: [{ poolId, name, type, reason }]   // up to 2, the suggested apply pools
 *   alsoEligible:[{ poolId, name, reason }]          // other matches (can't combine 2 School pools)
 *   verifyNotes: [string]                            // "check with a coordinator" prompts
 *   needsDisclaimer: bool                            // true if a School pool is involved
 * }
 *
 * Design rule (accuracy safeguard): the regional pool is the safe baseline and
 * is always offered to an eligible SA applicant. A School pool is only promised
 * when the student positively matches a named school, an education district, or
 * a partner university — never inferred from their IkamvaYouth branch alone.
 */
(function (global) {
  "use strict";

  var RHODES = global.RHODES || (global.RHODES = {});
  var D = RHODES.DATA;

  // ISO "YYYY-MM-DD" strings compare correctly with < / > (fixed width).
  function ageStatus(dob, lateCompletion, medical) {
    var A = D.GATING.age;
    if (!dob) return { eligible: false, reason: "missing" };
    if (dob > A.minBornOnOrBefore) return { eligible: false, reason: "tooyoung" };
    if (dob > A.standardBornAfter) return { eligible: true, reason: "standard" };
    if (dob > A.extendedBornAfter) {
      if (lateCompletion || medical) return { eligible: true, reason: "extended" };
      return { eligible: false, reason: "needsroute" };
    }
    return { eligible: false, reason: "tooold" };
  }

  var AGE_MESSAGES = {
    missing: "We need your date of birth to check the age criterion.",
    tooyoung: "You must be at least 19 when you start at Oxford in October 2027. Keep this in mind for a future cycle — you may well be eligible soon!",
    needsroute: "You're past the standard age window (born on/before 1 Oct 2002). You can still apply if you finished your first degree after 1 Oct 2025, or if you're a medical/health-sciences graduate in internship/community service.",
    tooold: "The age limit is 28 on entry (born after 1 Oct 1999). If your circumstances are exceptional, contact the Rhodes National Secretariat to check."
  };

  function evaluate(answers) {
    answers = answers || {};
    var failures = [];
    var warnings = [];

    // ---- 1. GATING ----------------------------------------------------------
    var citizenship = answers.citizenship; // country name | "refugee_sa" | "none"
    var isBLMNS = D.GATING.blmnsCountries.indexOf(citizenship) !== -1;
    var isCitizenOk =
      citizenship === "refugee_sa" ||
      D.GATING.citizenshipCountries.indexOf(citizenship) !== -1;

    if (!citizenship) {
      failures.push({ criterion: "Citizenship", message: "Please tell us your citizenship / legal status." });
    } else if (!isCitizenOk) {
      failures.push({
        criterion: "Citizenship",
        message: "The Southern Africa Scholarship is for citizens or permanent residents of South Africa, Botswana, Lesotho, Malawi, Namibia or eSwatini (and refugees/asylum seekers in South Africa). You may be eligible through a different Rhodes constituency — see the Rhodes website."
      });
    }

    if (answers.residency5of10 === false) {
      failures.push({
        criterion: "Residency",
        message: "You normally need to have lived in Southern Africa for at least 5 of the last 10 years. If your case is borderline, check with the Rhodes National Secretariat."
      });
    } else if (answers.residency5of10 == null) {
      warnings.push("We didn't get your residency answer — confirm you've lived in Southern Africa for 5 of the last 10 years.");
    }

    var age = ageStatus(answers.dob, answers.lateCompletion, answers.medical);
    if (!age.eligible) {
      failures.push({ criterion: "Age", message: AGE_MESSAGES[age.reason] || "Please check the age criteria." });
    }

    if (answers.degreeByJuly2027 === "no") {
      failures.push({
        criterion: "Undergraduate degree",
        message: "You need to have completed (or be completing) an undergraduate degree by July 2027. Not there yet? The Mandela Rhodes Foundation funds Honours/Master's study and can be a great stepping stone — and you can apply for Rhodes later."
      });
    } else if (answers.degreeByJuly2027 == null) {
      warnings.push("Confirm you'll have completed a Bachelor's degree by July 2027.");
    }

    // Academics never gate — they shape encouragement only.
    var academicsEncouragement = null;
    if (answers.academics === "notsure" || answers.academics === "close") {
      academicsEncouragement =
        "Rhodes looks at the whole person, not just marks — but strong academics matter. Talk to a coordinator about whether your results are competitive, and remember selectors value your leadership and service too.";
    }

    var gatePassed = failures.length === 0;
    var result = {
      gate: { passed: gatePassed, failures: failures, warnings: warnings, ageReason: age.reason },
      recommended: [],
      alsoEligible: [],
      verifyNotes: [],
      needsDisclaimer: false,
      academicsEncouragement: academicsEncouragement
    };
    if (!gatePassed) return result;

    // ---- 2. BLMNS short-circuit --------------------------------------------
    if (isBLMNS) {
      var blmns = D.poolById("blmns");
      result.recommended.push({
        poolId: "blmns", name: blmns.name, type: "blmns",
        reason: "You're a citizen/legal resident of " + citizenship + " → you apply to the BLMNS pool (and only this pool)."
      });
      return result;
    }

    // ---- 3. Pool membership (South Africa) ----------------------------------
    // Regional pool: always the safe baseline.
    var regionId = D.PROVINCE_TO_REGION[answers.province];
    var regionRec = null;
    if (regionId) {
      var region = D.poolById(regionId);
      regionRec = {
        poolId: regionId, name: region.name, type: "region",
        reason: "You live in / studied in " + answers.province + " → the " + region.short + " pool."
      };
    } else if (citizenship === "refugee_sa") {
      // Refugee/asylum seeker in SA without a province picked — still route via region once known.
      result.verifyNotes.push("Pick the South African province where you live or studied to see your regional pool.");
    } else {
      result.verifyNotes.push("Choose your South African province to see your regional pool.");
    }

    // School pools: only when positively matched. Collect {poolId: {reason, rank}}.
    // rank: 3 = named school (strongest), 2 = university, 1 = district.
    var schoolMatches = {};
    function addSchool(poolId, reason, rank) {
      if (!poolId) return;
      if (!schoolMatches[poolId] || rank > schoolMatches[poolId].rank) {
        schoolMatches[poolId] = { reason: reason, rank: rank };
      }
    }

    if (answers.partnerSchool && answers.partnerSchool !== "none") {
      for (var i = 0; i < D.PARTNER_SCHOOLS.length; i++) {
        if (D.PARTNER_SCHOOLS[i].name === answers.partnerSchool) {
          var ps = D.PARTNER_SCHOOLS[i];
          addSchool(ps.pool, "You matriculated from " + ps.name + " → the " + D.poolById(ps.pool).short + " pool.", 3);
        }
      }
    }

    if (answers.university && answers.university !== "none") {
      for (var u = 0; u < D.UNIVERSITIES.length; u++) {
        if (D.UNIVERSITIES[u].name === answers.university) {
          var uni = D.UNIVERSITIES[u];
          addSchool(uni.pool, "You're a " + uni.name + " graduate → the " + D.poolById(uni.pool).short + " pool.", 2);
        }
      }
    }

    if (answers.schoolZone && answers.schoolZone !== "none" && answers.schoolZone !== "notsure") {
      for (var z = 0; z < D.SCHOOL_ZONES.length; z++) {
        if (D.SCHOOL_ZONES[z].id === answers.schoolZone) {
          var zone = D.SCHOOL_ZONES[z];
          addSchool(zone.pool, "Your high school is in " + zone.label + " → the " + D.poolById(zone.pool).short + " pool.", 1);
        }
      }
    } else if (answers.schoolZone === "notsure") {
      result.verifyNotes.push(
        "You weren't sure of your high school's education district. You might also qualify for a School scholarship — a coordinator can help you check which district your school falls in."
      );
    }

    // ---- 4. Combination rules (max 2 pools; at most ONE School pool) --------
    // Pick the strongest School pool (highest rank) as the recommended School pool.
    var schoolIds = Object.keys(schoolMatches);
    var bestSchoolId = null, bestRank = -1;
    for (var s = 0; s < schoolIds.length; s++) {
      if (schoolMatches[schoolIds[s]].rank > bestRank) {
        bestRank = schoolMatches[schoolIds[s]].rank;
        bestSchoolId = schoolIds[s];
      }
    }

    if (bestSchoolId) {
      var bestSchool = D.poolById(bestSchoolId);
      result.recommended.push({
        poolId: bestSchoolId, name: bestSchool.name, type: "school",
        reason: schoolMatches[bestSchoolId].reason
      });
      result.needsDisclaimer = true;
    }
    if (regionRec) result.recommended.push(regionRec);

    // Any other School matches become "also eligible" (but can't combine 2 School pools).
    for (var k = 0; k < schoolIds.length; k++) {
      if (schoolIds[k] !== bestSchoolId) {
        var other = D.poolById(schoolIds[k]);
        result.alsoEligible.push({
          poolId: schoolIds[k], name: other.name,
          reason: schoolMatches[schoolIds[k]].reason
        });
      }
    }
    if (result.alsoEligible.length) {
      result.verifyNotes.push(
        "You match more than one School scholarship, but you may apply to only ONE School pool (plus your regional pool). Pick the one you have the strongest connection to — a coordinator can advise."
      );
    }

    return result;
  }

  RHODES.engine = { evaluate: evaluate, ageStatus: ageStatus };
})(typeof window !== "undefined" ? window : globalThis);
