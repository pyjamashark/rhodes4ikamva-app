/*
 * data.js: ALL Rhodes Scholarship (Southern Africa, 2027) facts in one place.
 *
 * Pure data. No DOM, no logic. To update a fact (a date, a district, the apply
 * link), edit THIS file only and redeploy. Verified against the official 2027
 * "Information for Candidates" (IFC), the Rhodes/Schools Joint Statement, and
 * the 2027 Document Checklist. Branch to school to district mapping uses the
 * IkamvaYouth branches page and the WCED education-district school lists.
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
    appClose: "2026-08-03T23:59:00+02:00", // 23:59 SAST, Mon 03 Aug 2026  (countdown target)
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
      "agreed change by the Charity Commission for England and Wales. Recipients are funded for " +
      "their full tenure regardless of the outcome.",

    notOfficial:
      "This is a free guidance tool made to help IkamvaYouth students. It is not an official " +
      "Rhodes Trust channel. Always confirm details on the official Rhodes website."
  };

  // ---------------------------------------------------------------------------
  // Gating criteria. ALL must hold for ANY Southern Africa application.
  // ---------------------------------------------------------------------------
  var GATING = {
    citizenshipCountries: [
      "South Africa", "Botswana", "Lesotho", "Malawi", "Namibia", "eSwatini"
    ],
    blmnsCountries: ["Botswana", "Lesotho", "Malawi", "Namibia", "eSwatini"],

    residencyYearsRequired: 5, // resident in Southern Africa for 5 of the last 10 years

    // Age windows, expressed as the date-of-birth boundaries the IFC gives.
    // Standard: at least 19 and not yet 25 on entry (01 Oct 2027), i.e.
    //   born after 01 Oct 2002 AND on or before 01 Oct 2008.
    // Extended (late first degree, or medical/health-sciences): not yet 28 on
    //   entry, i.e. born after 01 Oct 1999 (and older than the standard window).
    age: {
      minBornOnOrBefore: "2008-10-01", // born after this is younger than 19 on entry (too young)
      standardBornAfter: "2002-10-01", // standard window lower edge
      extendedBornAfter: "1999-10-01", // extended window lower edge (too old if born on or before)
      lateDegreeCompletedAfter: "2025-10-01" // late-undergrad route: first degree completed after this
    },

    degreeByDate: "2027-07-31", // undergraduate (usually Bachelor's) completed by July 2027
    english: true
  };

  // SA provinces to regional (South Africa-at-Large) pool id. Every SA province
  // maps to exactly one region, so a SA applicant always has a regional pool as a
  // safe baseline.
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
  //   "region"  EC&FS, KZN, GLMN, WC&NC   (KZN is a region for combo purposes)
  //   "blmns"   single-pool-only
  //   "school"  SACS, Paul Roos, Bishops, St Andrew's (max ONE school pool)
  // ---------------------------------------------------------------------------
  var POOLS = [
    {
      id: "ec_fs", type: "region", name: "Eastern Cape and Free State",
      short: "Eastern Cape and Free State",
      blurb: "The South Africa-at-Large regional committee for the Eastern Cape and Free State."
    },
    {
      id: "kzn", type: "region", name: "KwaZulu-Natal",
      short: "KwaZulu-Natal",
      blurb: "The KZN committee awards its own Scholarship and can also send finalists to the national committee."
    },
    {
      id: "glmn", type: "region", name: "Gauteng, Limpopo, Mpumalanga and North-West (GLMN)",
      short: "GLMN",
      blurb: "The South Africa-at-Large regional committee for Gauteng, Limpopo, Mpumalanga and North-West."
    },
    {
      id: "wc_nc", type: "region", name: "Western Cape and Northern Cape",
      short: "Western Cape and Northern Cape",
      blurb: "The South Africa-at-Large regional committee for the Western Cape and Northern Cape."
    },

    {
      id: "blmns", type: "blmns", name: "Botswana, Lesotho, Malawi, Namibia and eSwatini (BLMNS)",
      short: "BLMNS",
      blurb: "For citizens or legal residents of Botswana, Lesotho, Malawi, Namibia or eSwatini. BLMNS applicants apply to this pool only."
    },

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
      blurb: "Open to any high school in the Cape Winelands, Eden and Central Karoo, Overberg and West Coast education districts.",
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
      blurb: "Open to any high school in the Cape Town Metro South education district, plus named partner schools including LEAP Langa.",
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

  // Named partner schools the user can pick directly (school to pool id).
  var PARTNER_SCHOOLS = [
    { name: "LEAP Science and Maths School (Langa)", pool: "bishops" },
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
    { name: "St Andrew's College", pool: "standrews" },
    { name: "Diocesan School for Girls (DSG)", pool: "standrews" }
  ];

  // Education-district / municipality zones (chosen zone to school pool id).
  var SCHOOL_ZONES = [
    { id: "makhana", label: "Makhanda / Grahamstown (Makhana municipality)", pool: "standrews",
      area: "Makhanda", district: "Makhana municipality",
      help: "Any high school in the Makhana municipality of the Eastern Cape." },
    { id: "metro_south", label: "Cape Town, Metro South education district", pool: "bishops",
      area: "the Cape Town Metro South area", district: "Cape Town Metro South",
      help: "WCED Metro South district. Includes schools such as Oscar Mpetha High (Nyanga), Fezeka, Masiphumelele, Mitchells Plain, Retreat, Grassy Park, Wynberg." },
    { id: "cape_winelands", label: "Cape Winelands district (Stellenbosch, Paarl, Worcester)", pool: "paulroos",
      area: "the Cape Winelands", district: "Cape Winelands",
      help: "WCED Cape Winelands district. Includes Stellenbosch (Makupula, Kayamandi), Drakenstein/Paarl, Breede Valley/Worcester, Witzenberg, Langeberg." },
    { id: "eden_karoo", label: "Eden and Central Karoo district (Garden Route, Karoo)", pool: "paulroos",
      area: "the Eden and Central Karoo", district: "Eden and Central Karoo",
      help: "WCED Eden and Central Karoo district (George, Mossel Bay, Oudtshoorn, Beaufort West)." },
    { id: "overberg", label: "Overberg district (Caledon, Hermanus, Swellendam)", pool: "paulroos",
      area: "the Overberg", district: "Overberg", help: "WCED Overberg district." },
    { id: "west_coast", label: "West Coast district (Vredenburg, Malmesbury, Vredendal)", pool: "paulroos",
      area: "the West Coast", district: "West Coast", help: "WCED West Coast district." }
  ];

  var UNIVERSITIES = [
    { name: "University of Cape Town (UCT)", pool: "sacs" },
    { name: "Rhodes University", pool: "standrews" }
  ];

  // ---------------------------------------------------------------------------
  // IkamvaYouth branches. Each branch is hosted at / linked to a specific high
  // school (from ikamvayouth.org/branches), which tells us the education
  // district and therefore the likely School pool. zone is a SCHOOL_ZONES id or
  // null. The flow uses this to pre-fill the School pool, then asks the student
  // to confirm (so a student who matriculated elsewhere is never mis-matched).
  // ---------------------------------------------------------------------------
  var BRANCHES = [
    // Western Cape
    { branch: "Khayelitsha", province: "Western Cape", host: "Harry Gwala Secondary School",
      zone: null, note: "Khayelitsha sits in the WCED Metro East district, which does not trigger a School pool by area, so most learners apply via the regional pool. If your own high school is in the Metro South district, you may still qualify for Bishops." },
    { branch: "Nyanga", province: "Western Cape", host: "Oscar Mpetha High School", zone: "metro_south" },
    { branch: "Gugulethu", province: "Western Cape", host: "Gugulethu Comprehensive School", zone: "metro_south", confidence: "medium" },
    { branch: "Kayamandi (Stellenbosch)", province: "Western Cape", host: "Makupula Secondary School", zone: "cape_winelands" },
    { branch: "Atlantis", province: "Western Cape", host: "Robinvale High School", zone: null,
      note: "Atlantis sits in the WCED Metro North district, so most learners apply via the regional pool." },
    // Gauteng
    { branch: "Tembisa", province: "Gauteng", host: "Kaalfontein Secondary School", zone: null },
    { branch: "Mamelodi", province: "Gauteng", zone: null },
    { branch: "Diepsloot", province: "Gauteng", zone: null },
    // KwaZulu-Natal
    { branch: "Chesterville", province: "KwaZulu-Natal", zone: null },
    // Eastern Cape
    { branch: "Joza (Makhanda)", province: "Eastern Cape", host: "Nombulelo Secondary School", zone: "makhana" },
    // North West
    { branch: "Ikageng (Potchefstroom)", province: "North West", zone: null },
    { branch: "Mahikeng", province: "North West", host: "Danville Secondary School", zone: null }
  ];

  // ---------------------------------------------------------------------------
  // Application document checklist (verified vs. 2027 Document Checklist + IFC)
  // ---------------------------------------------------------------------------
  var DOCUMENTS = [
    { label: "Birth certificate", note: "A copy of your birth certificate. This is NOT your ID card." },
    { label: "ID document or valid passport", note: "Candidates not born in Southern Africa also supply proof of citizenship, permanent residence or refugee status." },
    { label: "Full university transcript", note: "Showing your grades from first to final year, to date." },
    { label: "Degree certificate(s)", note: "If you have already graduated." },
    { label: "Matric / NSC certificate (UMALUSI)", note: "Your final Grade 12 results (IEB or NSC)." },
    { label: "Grade 12 Term 3/4 report", note: "ONLY if applying for a School scholarship (Bishops, Paul Roos, SACS, St Andrew's).", schoolOnly: true },
    { label: "Curriculum Vitae (CV)", note: "Use the official editable PDF template. Maximum 2 pages, 12pt." },
    { label: "Personal statement", note: "Maximum 1000 words. Your story, in your own voice." },
    { label: "Academic statement of study", note: "Maximum 450 words. Your Oxford course plan and academic goals." },
    { label: "Head-and-shoulders photo", note: "Colour, JPG format." },
    { label: "Four referees", note: "Three academic referees plus one character referee. A high-school teacher does NOT count as an academic referee." }
  ];

  // The four Rhodes selection criteria (drawn from the founder's Will).
  var SELECTION_CRITERIA = [
    { title: "Academic excellence", body: "You must at least meet the entry requirements of your chosen Oxford course. Most successful applicants exceed them." },
    { title: "Energy to use your talents to the full", body: "Shown through success in areas like sport, music, debate, dance, theatre and the arts, especially in a team." },
    { title: "Truth, courage and devotion to duty", body: "Sympathy for and protection of the weak; kindliness, unselfishness and fellowship." },
    { title: "Moral force of character and instinct to lead", body: "And to take a genuine interest in your fellow human beings." }
  ];

  // What the Scholarship covers (Conditions of Tenure summary).
  var COVERS = [
    "All University and college fees at Oxford",
    "A generous annual living stipend (accommodation and food)",
    "Return economy flights to the UK plus a settling-in allowance",
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

  RHODES.DATA.poolById = function (id) {
    for (var i = 0; i < POOLS.length; i++) if (POOLS[i].id === id) return POOLS[i];
    return null;
  };
  RHODES.DATA.zoneById = function (id) {
    for (var i = 0; i < SCHOOL_ZONES.length; i++) if (SCHOOL_ZONES[i].id === id) return SCHOOL_ZONES[i];
    return null;
  };
  RHODES.DATA.branchByName = function (name) {
    for (var i = 0; i < BRANCHES.length; i++) if (BRANCHES[i].branch === name) return BRANCHES[i];
    return null;
  };
})(typeof window !== "undefined" ? window : globalThis);
