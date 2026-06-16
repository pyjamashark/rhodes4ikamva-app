/*
 * app.js: UI controller. Renders the countdown, drives the question flow,
 * computes results via RHODES.engine, and builds the (no-backend) contact links.
 * Classic script. Depends on data.js + engine.js being loaded first.
 */
(function () {
  "use strict";
  var DATA = window.RHODES.DATA;
  var engine = window.RHODES.engine;

  /* Contacts and links on the results page. Per organiser guidance the Rhodes
     office is for INFORMATION / QUERIES only (not application help) so it is not
     swamped; application support comes from branch teams and, for Bishops, the
     volunteer mentor form. */
  var CONTACT = {
    rhodesName: "Beverley Johnson, Regional Manager of the Rhodes Scholarships for Southern Africa",
    rhodesEmail: "southernafrica.secretary@rhodestrust.com"
  };
  var LINKS = {
    branchTeam: "https://ikamvayouth.org/our-team/",
    bishopsForm: "https://forms.gle/nQ4Huc1uGN5xqmN57" // Bishops interest form ("Going for the Bishops Rhodes Scholarship? Register here")
  };
  var UPDATED = "16 June 2026";

  // ---- tiny DOM helper ------------------------------------------------------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "text") n.textContent = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    if (kids != null) {
      if (!Array.isArray(kids)) kids = [kids];
      kids.forEach(function (c) {
        if (c == null) return;
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return n;
  }
  function byId(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ---- navigation between top-level sections --------------------------------
  var SECTIONS = ["home", "check", "result", "about", "faq"];
  function show(id) {
    SECTIONS.forEach(function (s) { byId(s).hidden = (s !== id); });
    if (id !== "check" && id !== "result") {
      try { history.replaceState(null, "", "#" + id); } catch (e) {}
    }
    window.scrollTo(0, 0);
    var h = byId(id).querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // ---- countdown ------------------------------------------------------------
  function deadline() { return new Date(DATA.META.appClose); }
  function timeLeft() { return deadline().getTime() - Date.now(); }
  function daysLeft() { return Math.max(0, Math.floor(timeLeft() / 86400000)); }

  function renderCountdown() {
    var box = byId("countdown"), cap = byId("cd-caption");
    var ms = timeLeft();
    box.hidden = false; cap.hidden = false;
    clear(box);
    if (ms <= 0) {
      box.className = "countdown closed";
      box.appendChild(el("div", { class: "cd-unit" }, el("div", { class: "cd-num", text: "Closed" })));
      cap.textContent = "The 2027 application window has closed. Watch for the next cycle.";
      return;
    }
    box.className = "countdown";
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    [["Days", d], ["Hours", h], ["Mins", m]].forEach(function (u) {
      box.appendChild(el("div", { class: "cd-unit" }, [
        el("div", { class: "cd-num", text: String(u[1]) }),
        el("div", { class: "cd-lab", text: u[0] })
      ]));
    });
    cap.textContent = "until applications close, 23:59 on 3 August 2026";
  }

  // ---- static content -------------------------------------------------------
  function initStatic() {
    var cov = byId("covers-list");
    DATA.COVERS.forEach(function (c) {
      cov.appendChild(el("div", { class: "feature" }, [
        el("span", { class: "f-ic", text: "✓" }),
        el("div", null, el("h3", { text: c }))
      ]));
    });
    var crit = byId("criteria-list");
    DATA.SELECTION_CRITERIA.forEach(function (c, i) {
      crit.appendChild(el("div", { class: "feature" }, [
        el("span", { class: "f-ic", text: String(i + 1) }),
        el("div", null, [el("h3", { text: c.title }), el("p", { text: c.body })])
      ]));
    });
    byId("faq-disclaimer").textContent = DATA.META.disclaimer;
    byId("mrf-link").href = DATA.META.mandelaRhodesUrl;
    byId("foot-notofficial").textContent = DATA.META.notOfficial;
    byId("foot-disclaimer").textContent = DATA.META.disclaimer;
    byId("foot-updated").textContent = "Last updated: " + UPDATED + ". Rhodes 2027 cycle.";
  }

  /* ===========================================================================
   * QUESTION FLOW
   * ======================================================================== */
  var answers = {};
  var history2 = []; // step ids shown, in order

  function isSAbased() {
    return answers.citizenship === "South Africa" || answers.citizenship === "refugee_sa";
  }
  function hasBranchZone() { return !!answers.branchZone; }
  function olderBandNeedsRoute(dob) {
    var A = DATA.GATING.age;
    return dob && dob <= A.standardBornAfter && dob > A.extendedBornAfter;
  }

  var STEPS = [
    {
      id: "branch",
      build: function () {
        var opts = DATA.BRANCHES.map(function (b) {
          return { main: b.branch, sub: b.province, patch: { branch: b.branch, province: b.province, branchZone: b.zone || null } };
        });
        opts.push({ main: "I am not at an IkamvaYouth branch / other", patch: { branch: "other", branchZone: null } });
        return {
          legend: "Which IkamvaYouth branch did you attend?",
          help: "The branch where you went to after-school sessions. This helps us point you to the right scholarship. Choose 'other' if it does not apply.",
          choices: opts
        };
      }
    },
    {
      id: "citizenship",
      build: function () {
        var countries = ["South Africa", "Botswana", "Lesotho", "Malawi", "Namibia", "eSwatini"];
        var opts = countries.map(function (c) { return { main: c, patch: { citizenship: c } }; });
        opts.push({ main: "Refugee or asylum seeker in South Africa", patch: { citizenship: "refugee_sa" } });
        opts.push({ main: "None of these", patch: { citizenship: "none" } });
        return {
          legend: "Where are you a citizen or permanent resident?",
          help: "The Southern Africa Rhodes Scholarship covers these countries.",
          choices: opts
        };
      }
    },
    {
      id: "residency",
      build: function () {
        return {
          legend: "Have you lived in Southern Africa for at least 5 of the last 10 years?",
          choices: [
            { main: "Yes", patch: { residency5of10: true } },
            { main: "No", patch: { residency5of10: false } }
          ]
        };
      }
    },
    {
      id: "dob",
      type: "date",
      build: function () {
        return {
          legend: "What is your date of birth?",
          help: "Used only to check the age criterion. Nothing is saved or sent."
        };
      }
    },
    {
      id: "ageroute",
      when: function () { return olderBandNeedsRoute(answers.dob); },
      build: function () {
        return {
          legend: "You are a little past the standard age window. That is fine if one of these applies:",
          help: "Older applicants can still be eligible in these cases.",
          choices: [
            { main: "I finished (or will finish) my first degree after 1 Oct 2025", patch: { lateCompletion: true, medical: false } },
            { main: "I am a medical or health-sciences graduate in internship or community service", patch: { lateCompletion: false, medical: true } },
            { main: "Neither of these", patch: { lateCompletion: false, medical: false } }
          ]
        };
      }
    },
    {
      id: "degreeByJuly2027",
      build: function () {
        return {
          legend: "Will you have completed an undergraduate (Bachelor's) degree by July 2027?",
          help: "Currently studying and finishing by mid-2027? Choose 'Yes'.",
          choices: [
            { main: "Yes", patch: { degreeByJuly2027: "yes" } },
            { main: "No, not by then", patch: { degreeByJuly2027: "no" } }
          ]
        };
      }
    },
    {
      id: "academics",
      build: function () {
        return {
          legend: "Roughly, how are your university marks?",
          help: "This does not decide anything here. Rhodes looks at the whole person. Answer honestly so we can guide you well.",
          choices: [
            { main: "First-class / distinction level", sub: "around 75%+ / GPA 3.7+", patch: { academics: "yes" } },
            { main: "Strong, getting there", patch: { academics: "close" } },
            { main: "Not sure", patch: { academics: "notsure" } }
          ]
        };
      }
    },
    {
      id: "province",
      when: function () { return isSAbased() && !answers.province; },
      build: function () {
        return {
          legend: "Which South African province do you live in, or study in most?",
          choices: DATA.PROVINCES.map(function (p) { return { main: p, patch: { province: p } }; })
        };
      }
    },
    {
      // Streamlined: for a branch in a School-pool area, confirm in one tap.
      id: "schoolConfirm",
      when: function () { return isSAbased() && hasBranchZone(); },
      build: function () {
        var zone = DATA.zoneById(answers.branchZone);
        var poolShort = DATA.poolById(zone.pool).short;
        var br = DATA.branchByName(answers.branch);
        var host = br && br.host ? br.host : null;
        return {
          legend: "You are at the " + answers.branch + " branch, in " + zone.area + " (" + zone.district + " education district).",
          help: (host ? "Your branch is linked to " + host + ". " : "") + "High schools in this area qualify for the " + poolShort + " scholarship.",
          choices: [
            { main: host ? "Yes, I matriculated at " + host : "Yes, I matriculated at a school in this area",
              sub: host ? "or another school in " + zone.area : null,
              patch: { schoolZone: answers.branchZone, schoolFromBranch: true } },
            { main: "No, I matriculated at a different school or area", patch: { schoolConfirmOther: true } }
          ]
        };
      }
    },
    {
      id: "schoolZonePick",
      when: function () { return isSAbased() && (!hasBranchZone() || answers.schoolConfirmOther === true); },
      build: function () {
        var opts = DATA.SCHOOL_ZONES.map(function (z) {
          return { main: z.label, sub: z.help, patch: { schoolZone: z.id, schoolFromBranch: false, wantPartner: false } };
        });
        opts.push({ main: "I matriculated at a named partner school", sub: "LEAP Langa, SACS, Bishops, Paul Roos, St Andrew's College, and others", patch: { wantPartner: true } });
        opts.push({ main: "Somewhere else in South Africa", patch: { schoolZone: "none", wantPartner: false } });
        opts.push({ main: "I am not sure which district", patch: { schoolZone: "notsure", wantPartner: false } });
        return {
          legend: "Where did you finish Grade 12 (matriculate)?",
          help: "Some School scholarships are now open to whole education districts.",
          choices: opts
        };
      }
    },
    {
      id: "partnerPick",
      when: function () { return isSAbased() && answers.wantPartner === true; },
      build: function () {
        var opts = DATA.PARTNER_SCHOOLS.map(function (s) {
          return { main: s.name, patch: { partnerSchool: s.name } };
        });
        opts.push({ main: "None of these after all", patch: { partnerSchool: "none" } });
        return {
          legend: "Which partner school did you matriculate from?",
          choices: opts
        };
      }
    },
    {
      id: "university",
      when: function () { return isSAbased(); },
      build: function () {
        return {
          legend: "Did you (or will you) graduate from one of these universities?",
          help: "UCT and Rhodes University have links to Rhodes School scholarships.",
          choices: [
            { main: "University of Cape Town (UCT)", patch: { university: "University of Cape Town (UCT)" } },
            { main: "Rhodes University", patch: { university: "Rhodes University" } },
            { main: "Neither / another university", patch: { university: "none" } }
          ]
        };
      }
    }
  ];

  function stepById(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return STEPS[i];
    return null;
  }
  function applicable(step) { return !step.when || step.when() === true; }
  function applicableList() { return STEPS.filter(applicable); }

  function startCheck() {
    answers = {};
    history2 = [];
    show("check");
    goNext();
  }

  function goNext() {
    var next = null;
    for (var i = 0; i < STEPS.length; i++) {
      if (applicable(STEPS[i]) && history2.indexOf(STEPS[i].id) === -1) { next = STEPS[i]; break; }
    }
    if (!next) { finish(); return; }
    history2.push(next.id);
    renderStep(next);
  }

  function goBack() {
    history2.pop();
    if (history2.length === 0) { show("home"); return; }
    renderStep(stepById(history2[history2.length - 1]));
  }

  function onAnswer(patch) {
    Object.keys(patch).forEach(function (k) { answers[k] = patch[k]; });
    goNext();
  }

  function renderProgress(currentId) {
    var bar = byId("progress");
    clear(bar);
    var list = applicableList();
    var idx = list.map(function (s) { return s.id; }).indexOf(currentId);
    list.forEach(function (s, i) {
      var cls = "dot" + (i < idx ? " done" : i === idx ? " now" : "");
      bar.appendChild(el("span", { class: cls }));
    });
  }

  function renderStep(step) {
    renderProgress(step.id);
    var spec = step.build();
    var cont = byId("q-container");
    clear(cont);

    var legend = el("div", { class: "q-legend", text: spec.legend, tabindex: "-1" });
    var wrap = el("div", { class: "q-step" }, [legend]);
    if (spec.help) wrap.appendChild(el("div", { class: "q-help", text: spec.help }));

    if (step.type === "date") {
      var input = el("input", { type: "date", id: "dob-input", max: "2010-12-31", value: answers.dob || "" });
      var err = el("div", { class: "note note-warn", text: "Please enter your date of birth.", style: "display:none" });
      wrap.appendChild(input);
      wrap.appendChild(err);
      wrap.appendChild(el("button", { class: "btn btn-primary btn-block", type: "button", style: "margin-top:14px",
        onclick: function () {
          if (!input.value) { err.style.display = "block"; return; }
          onAnswer({ dob: input.value });
        }
      }, "Continue"));
    } else {
      var fs = el("fieldset", null);
      var box = el("div", { class: "choices" });
      spec.choices.forEach(function (c) {
        var kids = [el("span", { class: "c-main", text: c.main })];
        if (c.sub) kids.push(el("span", { class: "c-sub", text: c.sub }));
        box.appendChild(el("button", { class: "choice", type: "button",
          onclick: function () { onAnswer(c.patch); } }, kids));
      });
      fs.appendChild(box);
      wrap.appendChild(fs);
    }

    wrap.appendChild(el("div", { class: "q-nav" }, [
      el("button", { class: "navlink", type: "button", onclick: goBack, text: "Back" }),
      el("button", { class: "navlink", type: "button", onclick: function () { show("home"); }, text: "Exit" })
    ]));
    cont.appendChild(wrap);
    legend.focus({ preventScroll: true });
  }

  /* ===========================================================================
   * RESULTS
   * ======================================================================== */
  function poolTagClass(type) { return type === "school" ? "school" : type === "blmns" ? "blmns" : "region"; }
  function poolTagLabel(type) { return type === "school" ? "School pool" : type === "blmns" ? "BLMNS pool" : "Regional pool"; }

  function matchedPool(r, id) {
    return r.recommended.concat(r.alsoEligible).some(function (p) { return p.poolId === id; });
  }

  // Prominent CTA for Bishops-eligible students: register with the volunteer
  // mentor team (they reach out, so no single inbox gets swamped).
  function bishopsCTA() {
    var card = el("div", { class: "card pool-card school" }, [
      el("span", { class: "pool-tag school", text: "Bishops support" }),
      el("h3", { text: "Going for the Bishops Scholarship?" }),
      el("p", { class: "muted", text: "A team of volunteers is offering to support strong Bishops applicants this year. Register your interest and one of us will get in touch to help you put your best application forward." })
    ]);
    if (LINKS.bishopsForm) {
      card.appendChild(el("div", { class: "btn-row" }, [
        el("a", { class: "btn btn-gold btn-block", href: LINKS.bishopsForm, target: "_blank", rel: "noopener" }, "Register your interest")
      ]));
    } else {
      card.appendChild(el("div", { class: "note note-info", text: "Our sign-up form is coming soon. For now, reach your branch team below and mention you are interested in Bishops." }));
    }
    return card;
  }

  // Branch-team support link + an information-only line for the Rhodes office.
  function infoLinks() {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("p", { class: "muted", text: "For advice specific to your situation, your IkamvaYouth branch team can help." }));
    frag.appendChild(el("div", { class: "btn-row" }, [
      el("a", { class: "btn btn-ghost btn-block", href: LINKS.branchTeam, target: "_blank", rel: "noopener" }, "Find your branch team")
    ]));
    frag.appendChild(el("p", { class: "small muted", html:
      "For further information or queries about the Scholarship itself, you can contact " + CONTACT.rhodesName +
      ", directly at <a href=\"mailto:" + CONTACT.rhodesEmail + "?subject=" + encodeURIComponent("Rhodes Scholarship query") +
      "\">" + CONTACT.rhodesEmail + "</a>." }));
    return frag;
  }

  function renderResult(r) {
    var c = byId("result-container");
    clear(c);

    if (!r.gate.passed) {
      c.appendChild(el("h1", { text: "Let's see where you stand", tabindex: "-1" }));
      c.appendChild(el("p", { class: "lead muted",
        text: "Based on your answers, one or two things would need to be true before you can apply this cycle:" }));
      r.gate.failures.forEach(function (f) {
        c.appendChild(el("div", { class: "note note-warn" }, [
          el("strong", { text: f.criterion }), document.createTextNode(f.message)
        ]));
      });
      c.appendChild(el("div", { class: "you-belong" }, [
        el("h3", { text: "Keep going." }),
        el("p", { text: "Many strong applicants apply more than once or take a stepping-stone route first. Talk to someone. It is worth it." })
      ]));
      c.appendChild(infoLinks());
      c.appendChild(el("div", { class: "btn-row" }, [
        el("a", { class: "btn btn-ghost btn-block", href: DATA.META.officialUrl, target: "_blank", rel: "noopener" }, "Read the official criteria"),
        el("button", { class: "btn btn-ghost btn-block", type: "button", onclick: startCheck }, "Start over")
      ]));
      return;
    }

    c.appendChild(el("h1", { text: "Good news, you may be able to apply!", tabindex: "-1" }));
    c.appendChild(el("p", { class: "lead",
      text: r.recommended.length > 1
        ? "You appear to match these Rhodes pools. You can apply to up to two, usually a School pool plus your regional pool:"
        : "You appear to match this Rhodes pool:" }));

    r.recommended.forEach(function (p) {
      c.appendChild(el("div", { class: "card pool-card " + poolTagClass(p.type) }, [
        el("span", { class: "pool-tag " + poolTagClass(p.type), text: poolTagLabel(p.type) }),
        el("h3", { text: p.name }),
        el("p", { class: "muted", text: p.reason })
      ]));
    });

    if (r.academicsEncouragement) {
      c.appendChild(el("div", { class: "note note-info" }, [el("strong", { text: "A note on marks" }), document.createTextNode(r.academicsEncouragement)]));
    }
    r.verifyNotes.forEach(function (n) {
      c.appendChild(el("div", { class: "note note-info", text: n }));
    });
    if (r.alsoEligible.length) {
      var also = el("div", { class: "note note-warn" }, [el("strong", { text: "You may also match:" })]);
      r.alsoEligible.forEach(function (p) { also.appendChild(el("div", { text: "• " + p.name })); });
      c.appendChild(also);
    }

    c.appendChild(el("div", { class: "note note-stop", html:
      "<strong>" + daysLeft() + " days left.</strong> Applications close 23:59 SAST on 3 August 2026. Start early, it is load-shedding season." }));

    var docCard = el("div", { class: "card" }, [el("h2", { text: "What you will need to apply" })]);
    var ul = el("ul", { class: "checklist" });
    DATA.DOCUMENTS.forEach(function (d, i) {
      if (d.schoolOnly && !r.needsDisclaimer) return;
      var cb = el("input", { type: "checkbox", id: "doc" + i });
      var lab = el("label", { for: "doc" + i }, [
        el("span", { class: "doc-main", text: d.label }),
        el("span", { class: "ck-note", text: d.note + (d.schoolOnly ? " (School pools only)" : "") })
      ]);
      cb.addEventListener("change", function () { lab.classList.toggle("done-label", cb.checked); });
      ul.appendChild(el("li", null, [cb, lab]));
    });
    docCard.appendChild(ul);
    c.appendChild(docCard);

    c.appendChild(el("div", { class: "btn-row" }, [
      el("a", { class: "btn btn-gold btn-block", href: DATA.META.officialUrl, target: "_blank", rel: "noopener" }, "Apply on the official Rhodes site")
    ]));
    c.appendChild(el("h2", { text: "Need more information or support?" }));
    if (matchedPool(r, "bishops")) c.appendChild(bishopsCTA());
    c.appendChild(infoLinks());

    if (r.needsDisclaimer) {
      c.appendChild(el("div", { class: "note note-info", text: DATA.META.disclaimer }));
    }
    c.appendChild(el("div", { class: "you-belong" }, [
      el("h3", { text: "You belong in this." }),
      el("p", { text: "Selectors look for your authentic voice and your commitment to others, not a 'type'. IkamvaYouth's leadership and service are exactly what Rhodes values." })
    ]));
    c.appendChild(el("div", { class: "btn-row" }, [
      el("button", { class: "btn btn-ghost btn-block", type: "button", onclick: startCheck }, "Start over")
    ]));
  }

  function finish() {
    var r = engine.evaluate(answers);
    renderResult(r);
    show("result");
  }

  // ---- wire up --------------------------------------------------------------
  function init() {
    initStatic();
    renderCountdown();
    setInterval(renderCountdown, 30000);

    byId("start-check").addEventListener("click", startCheck);
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-go");
        if (t === "check") startCheck(); else show(t);
      });
    });

    var h = (location.hash || "").replace("#", "");
    show(SECTIONS.indexOf(h) !== -1 && h !== "check" && h !== "result" ? h : "home");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
