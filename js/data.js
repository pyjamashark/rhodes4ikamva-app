/*
 * data.js — ALL Rhodes Scholarship (Southern Africa, 2027) facts in one place.
 *
 * Pure data. No DOM, no logic. To update a fact (a date, a district, the apply
 * link), edit THIS file only and redeploy. Verified against the official 2027
 * "Information for Candidates" (IFC), the Rhodes/Schools Joint Statement, and
 * the 2027 Document Checklist.
 *
 * Loaded as a classic <script> in the browser (attaches to window.RHODES) and
 * via require() in the Node test (attaches to globalThis.RHODES).
 */
(function (global) {
  "use strict";

  var RHODES = global.RHODES || (global.RHODES = {});

  // ---------------------------------------------------------------------------
  // Cycle metadata, key dates, links, disclaimer
  // ---------------------------------------------------------------------------
  var META = {
    cycle: "2027",
    oxfordEntry: "2027-10-01",
    appOpen: "2026-06-01T00:01:00+02:00", // 00:01 SAST, Mon 01 Jun 2026
    appClose: "2026-08-03T23:59:00+02:00", // 23:59 SAST, Mon 03 Aug 2026  <-- the countdown target
    refClose: "2026-08-17T23:59:00+02:00", // 23:59 SAST, Mon 17 Aug 2026
    outcomeBy: "2026-12-31",

    // Official Rhodes pages (no application fee; applications are online via Embark).
    officialUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/",
    coursesUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/conditions-of-tenure/",
    mandelaRhodesUrl: "https://www.mandelarhodes.org/",

    // Accurate framing of the expanded School pools (see Joint Statement).
    disclaimer:
      "The four School scholarships are currently funded as interim Rhodes Scholarships " +
      "for this cycle (from the Rhodes Trust Public Purposes Fund), pending approval of the " +
      "agreed change by the Charity Commission for England & Wales. Recipients are funded for " +
      "their full tenure regardless of the outcome.",

    notOfficial:
      "This is a free guidance tool made to help IkamvaYouth students, not an official " +
      "Rhodes Trust channel. Always confirm details on the official Rhodes website."
  };

  // ---------------------------------------------------------------------------
  // Gating criteria — ALL must hold for ANY Southern Africa application
  // ---------------------------------------------------------------------------
  var GATING = {
    // Citizenship / legal permanent residence of one of these; refugees/asylum
    // seekers in South Africa are also considered in this constituency.
    citizenshipCountries: [
      "South Africa", "Botswana", "Lesotho", "Malawi", "Namibia", "eSwatini"
    ],
    // Countries whose citizens apply ONLY through the BLMNS pool.
    blmnsCountries: ["Botswana", "Lesotho", "Malawi", "Namibia", "eSwatini"],

    residencyYearsRequired: 5, // resident in Southern Africa >= 5 of the last 10 years

    // Age windows, expressed as the date-of-birth boundaries the IFC gives.
    // Standard: at least 19 and not yet 25 on entry (01 Oct 2027) =>
    //   born after 01 Oct 2002 AND on or before 01 Oct 2008.
    // Extended (late first degree, or medical/health-sciences): not yet 28 on
    //   entry => born after 01 Oct 1999 (and older than the standard window).
    age: {
      minBornOnOrBefore: "2008-10-01", // born after this => younger than 19 on entry (too young)
      standardBornAfter: "2002-10-01", // standard window lower edge
      extendedBornAfter: "1999-10-01", // extended window lower edge (too old if born on/before)
      lateDegreeCompletedAfter: "2025-10-01" // late-undergrad route: first degree completed after this
    },

    degreeByDate: "2027-07-31", // undergraduate (usually Bachelor's) completed by July 2027
    english: true
  };

  // SA provinces -> regional (South Africa-at-Large) pool id.
  // Every SA province maps to exactly one region, so a SA applicant always has
  // a regional pool as a safe baseline.
  var PROVINCE_TO_REGION = {
    "Eastern Cape": "ec_fs",
    "Free State": "ec_fs",
    "KwaZulu-Natal": "kzn",
    "Gauteng": "glmn",
    "Limpopo": "glmn",
    "Mpumalanga": "glmn",
    "North West": "glmn",
    "Western Cape": "wc_nc",
    "Northern Cape": "wc_nc"
  };

  var PROVINCES = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape"
  ];

  // ---------------------------------------------------------------------------
  // Pools. type drives the combination rules in engine.js:
  //   "region"  -> EC&FS, KZN, GLMN, WC&NC   (KZN is a region for combo purposes)
  //   "blmns"   -> single-pool-only
  //   "school"  -> SACS, Paul Roos, Bishops, St Andrew's (max ONE school pool)
  // ---------------------------------------------------------------------------
  var POOLS = [
    // ----- Regional South Africa-at-Large committees -----
    {
      id: "ec_fs", type: "region", name: "Eastern Cape & Free State",
      short: "Eastern Cape & Free State",
      blurb: "The South Africa-at-Large regional committee for the Eastern Cape and Free State."
    },
    {
      id: "kzn", type: "region", name: "KwaZulu-Natal",
      short: "KwaZulu-Natal",
      blurb: "The KZN committee awards its own Scholarship and can also send finalists to the national committee."
    },
    {
      id: "glmn", type: "region", name: "Gauteng, Limpopo, Mpumalanga & North-West (GLMN)",
      short: "GLMN",
      blurb: "The South Africa-at-Large regional committee for Gauteng, Limpopo, Mpumalanga and North-West."
    },
    {
      id: "wc_nc", type: "region", name: "Western Cape & Northern Cape",
      short: "Western Cape & Northern Cape",
      blurb: "The South Africa-at-Large regional committee for the Western Cape and Northern Cape."
    },

    // ----- BLMNS (single pool only) -----
    {
      id: "blmns", type: "blmns", name: "Botswana, Lesotho, Malawi, Namibia & eSwatini (BLMNS)",
      short: "BLMNS",
      blurb: "For citizens / legal residents of Botswana, Lesotho, Malawi, Namibia or eSwatini. BLMNS applicants apply to this pool only."
    },

    // ----- Four expanded School scholarships (interim-funded this cycle) -----
    {
      id: "sacs", type: "school", name: "SACS Scholarship",
      short: "SACS",
      blurb: "Linked to South African College School and partners, plus University of Cape Town graduates.",
      triggers: {
        matricSchools: [
          "South African College School (SACS)",
          "Rustenburg Girls' High School",
          "Sans Souci Girls' High School"
        ],
        universities: ["University of Cape Town (UCT)"]
      }
    },
    {
      id: "paulroos", type: "school", name: "Paul Roos Scholarship",
      short: "Paul Roos",
      blurb: "Open to any high school in the Cape Winelands, Eden & Central Karoo, Overberg and West Coast education districts.",
      triggers: {
        matricSchools: [
          "Paul Roos Gymnasium",
          "Rhenish Girls' High School",
          "Bloemhof Girls' High School"
        ],
        wcedDistricts: [
          "Cape Winelands",
          "Eden and Central Karoo",
          "Overberg",
          "West Coast"
        ]
      }
    },
    {
      id: "bishops", type: "school", name: "Bishops (Diocesan College) Scholarship",
      short: "Bishops",
      blurb: "Open to any high school in the Cape Town Metro South education district, plus named partner schools incl. LEAP Langa.",
      triggers: {
        matricSchools: [
          "Diocesan College (Bishops)",
          "Herschel Girls' School",
          "St Cyprian's School for Girls",
          "St George's Grammar School",
          "LEAP Science and Maths School (Langa)"
        ],
        wcedDistricts: ["Cape Town Metro South"]
      }
    },
    {
      id: "standrews", type: "school", name: "St Andrew's College Scholarship",
      short: "St Andrew's",
      blurb: "Open to any high school in the Makhanda (Makhana) municipality, plus Rhodes University graduates.",
      triggers: {
        matricSchools: [
          "St Andrew's College",
          "Diocesan School for Girls (DSG)"
        ],
        municipalities: ["Makhana (Makhanda / Grahamstown)"],
        universities: ["Rhodes University"]
      }
    }
  ];

  // Named partner schools the user can pick directly (school -> pool id).
  // Used by the "did you matriculate from one of these schools?" question.
  var PARTNER_SCHOOLS = [
    { name: "South African College School (SACS)", pool: "sacs" },
    { name: "Rustenburg Girls' High School", pool: "sacs" },
    { name: "Sans Souci Girls' High School", pool: "sacs" },
    { name: "Paul Roos Gymnasium", pool: "paulroos" },
    { name: "Rhenish Girls' High School", pool: "paulroos" },
    { name: "Bloemhof Girls' High School", pool: "paulroos" },
    { name: "Diocesan College (Bishops)", pool: "bishops" },
    { name: "Herschel Girls' School", pool: "bishops" },
    { name: "St Cyprian's School for Girls", pool: "bishops" },
    { name: "St George's Grammar School", pool: "bishops" },
    { name: "LEAP Science and Maths School (Langa)", pool: "bishops" },
    { name: "St Andrew's College", pool: "standrews" },
    { name: "Diocesan School for Girls (DSG)", pool: "standrews" }
  ];

  // Education-district / municipality options the user can pick if their exact
  // school is not in the partner list. Maps a chosen zone -> school pool id.
  var SCHOOL_ZONES = [
    { id: "makhana", label: "Makhanda / Grahamstown (Makhana municipality)", pool: "standrews",
      help: "Any high school in the Makhana municipality of the Eastern Cape." },
    { id: "metro_south", label: "Cape Town — Metro South education district", pool: "bishops",
      help: "WCED Metro South district (e.g. Mitchells Plain, Retreat, Grassy Park, Wynberg, Fish Hoek area)." },
    { id: "cape_winelands", label: "Cape Winelands education district (incl. Stellenbosch, Paarl, Worcester)", pool: "paulroos",
      help: "WCED Cape Winelands district — includes Stellenbosch, Drakenstein/Paarl, Breede Valley/Worcester, Witzenberg, Langeberg." },
    { id: "eden_karoo", label: "Eden & Central Karoo education district (Garden Route / Karoo)", pool: "paulroos",
      help: "WCED Eden & Central Karoo district (George, Mossel Bay, Oudtshoorn, Beaufort West, etc.)." },
    { id: "overberg", label: "Overberg education district (Caledon, Hermanus, Swellendam)", pool: "paulroos",
      help: "WCED Overberg district." },
    { id: "west_coast", label: "West Coast education district (Vredenburg, Malmesbury, Vredendal)", pool: "paulroos",
      help: "WCED West Coast district." }
  ];

  var UNIVERSITIES = [
    { name: "University of Cape Town (UCT)", pool: "sacs" },
    { name: "Rhodes University", pool: "standrews" }
  ];

  // ---------------------------------------------------------------------------
  // IkamvaYouth branches -> province + (where known) WCED district + pool hints.
  // districtConfidence drives the "please verify" UX. Verified against WCED
  // district sources; see README. NOTE: the engine never trusts branch alone to
  // promise a School pool — it asks the student's actual school/district.
  // ---------------------------------------------------------------------------
  var BRANCHES = [
    // Western Cape
    { branch: "Khayelitsha", province: "Western Cape", wcedDistrict: "Metro East", districtConfidence: "medium" },
    { branch: "Nyanga", province: "Western Cape", wcedDistrict: "Metro Central", districtConfidence: "high" },
    { branch: "Gugulethu", province: "Western Cape", wcedDistrict: "Metro Central", districtConfidence: "high" },
    { branch: "Kayamandi (Stellenbosch)", province: "Western Cape", wcedDistrict: "Cape Winelands", districtConfidence: "high", schoolPoolHint: "paulroos" },
    { branch: "Atlantis", province: "Western Cape", wcedDistrict: "Metro North", districtConfidence: "high" },
    // Gauteng
    { branch: "Tembisa", province: "Gauteng" },
    { branch: "Mamelodi", province: "Gauteng" },
    { branch: "Diepsloot", province: "Gauteng" },
    // KwaZulu-Natal
    { branch: "Chesterville", province: "KwaZulu-Natal" },
    { branch: "Umlazi", province: "KwaZulu-Natal" },
    // Eastern Cape
    { branch: "Joza (Makhanda)", province: "Eastern Cape", municipality: "Makhana (Makhanda / Grahamstown)", schoolPoolHint: "standrews" },
    // North West
    { branch: "Ikageng", province: "North West" },
    { branch: "Mahikeng", province: "North West" }
  ];

  // ---------------------------------------------------------------------------
  // Application document checklist (verified vs. 2027 Document Checklist + IFC)
  // ---------------------------------------------------------------------------
  var DOCUMENTS = [
    { label: "Birth certificate", note: "A copy of your birth certificate — this is NOT your ID card." },
    { label: "ID document or valid passport", note: "Non-Southern-African-born candidates also supply proof of citizenship / permanent residence / refugee status." },
    { label: "Full university transcript", note: "From first to final year, to date." },
    { label: "Degree certificate(s)", note: "If you have already graduated." },
    { label: "Matric / NSC certificate (UMALUSI)", note: "Your final Grade 12 results (IEB or NSC)." },
    { label: "Grade 12 Term 3/4 report", note: "ONLY if applying for a School scholarship (Bishops, Paul Roos, SACS, St Andrew's).", schoolOnly: true },
    { label: "Curriculum Vitae (CV)", note: "Use the official editable PDF template. Max 2 pages, 12pt." },
    { label: "Personal statement", note: "Max 1000 words — your story, in your own voice." },
    { label: "Academic statement of study", note: "Max 450 words — your Oxford course plan and academic goals." },
    { label: "Head-and-shoulders photo", note: "Colour, JPG format." },
    { label: "Four referees", note: "Three academic referees + one character referee. (A high-school teacher does NOT count as academic.)" }
  ];

  // The four Rhodes selection criteria (drawn from the founder's Will; verbatim framing from the IFC).
  var SELECTION_CRITERIA = [
    { title: "Academic excellence", body: "You must at least meet the entry requirements of your chosen Oxford course; most successful applicants exceed them." },
    { title: "Energy to use your talents to the full", body: "Shown through success in areas like sport, music, debate, dance, theatre and the arts — especially in a team." },
    { title: "Truth, courage & devotion to duty", body: "Sympathy for and protection of the weak; kindliness, unselfishness and fellowship." },
    { title: "Moral force of character & instinct to lead", body: "And to take a genuine interest in your fellow human beings." }
  ];

  // What the Scholarship covers (Conditions of Tenure summary).
  var COVERS = [
    "All University and college fees at Oxford",
    "A generous annual living stipend (accommodation & food)",
    "Return economy flights to the UK + a settling-in allowance",
    "UK student visa costs and the health surcharge",
    "At least two years of study at the University of Oxford"
  ];

  RHODES.DATA = {
    META: META,
    GATING: GATING,
    PROVINCES: PROVINCES,
    PROVINCE_TO_REGION: PROVINCE_TO_REGION,
    POOLS: POOLS,
    PARTNER_SCHOOLS: PARTNER_SCHOOLS,
    SCHOOL_ZONES: SCHOOL_ZONES,
    UNIVERSITIES: UNIVERSITIES,
    BRANCHES: BRANCHES,
    DOCUMENTS: DOCUMENTS,
    SELECTION_CRITERIA: SELECTION_CRITERIA,
    COVERS: COVERS
  };

  // Convenience: look up a pool object by id.
  RHODES.DATA.poolById = function (id) {
    for (var i = 0; i < POOLS.length; i++) {
      if (POOLS[i].id === id) return POOLS[i];
    }
    return null;
  };
})(typeof window !== "undefined" ? window : globalThis);
