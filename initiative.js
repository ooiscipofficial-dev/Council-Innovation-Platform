function initInitiativePage() {
  const initiativePage = document.getElementById("initiativePage");
  if (!initiativePage) return;

  const params = new URLSearchParams(window.location.search);
  const councilSlug = params.get("council") || "";
  const initiativeId = params.get("initiative") || "";
  const council = getCouncilBySlug(councilSlug);

  const notFound = document.getElementById("initiativeNotFound");
  if (!council) {
    initiativePage.querySelectorAll(".reveal").forEach((section) => section.classList.add("hidden"));
    notFound.classList.remove("hidden");
    return;
  }

  const initiative = (council.initiativeDetails || []).find((item) => item.id === initiativeId) || council.initiativeDetails[0];
  if (!initiative) {
    initiativePage.querySelectorAll(".reveal").forEach((section) => section.classList.add("hidden"));
    notFound.classList.remove("hidden");
    return;
  }

  const themeProfile = getCouncilThemeProfile(council);
  document.body.setAttribute("data-council-theme", themeProfile.key);
  document.documentElement.style.setProperty("--house-color", council.color || "#4e79db");
  document.documentElement.style.setProperty("--council-accent", council.color || "#5b8ef7");

  document.getElementById("initiativeTitle").textContent = initiative.title;
  document.getElementById("initiativeSummary").textContent = initiative.summary;
  document.getElementById("initiativeBackToCouncil").href = `council.html?council=${encodeURIComponent(councilSlug)}`;

  const lead = initiative.lead || {};
  const leadIsCouncil = lead.type === "council";
  const leadStudents = Array.isArray(lead.mainStudents) ? lead.mainStudents.filter((student) => student && student.name) : [];
  document.getElementById("initiativeLeadBlock").innerHTML = `
    <article class="initiative-person">
      <p class="text-xs text-muted">Initiative Lead</p>
      <h3 class="mt-1 text-lg font-semibold">${leadIsCouncil ? (lead.councilName || "Council Lead") : (lead.name || "Pending")}</h3>
      <p class="text-sm text-muted">${leadIsCouncil ? (lead.role || "Council Initiative Lead") : [lead.role, lead.class].filter(Boolean).join(" - ")}</p>
      ${leadStudents.length ? `
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          ${leadStudents.map((student) => `
            <div class="rounded-lg border border-theme/40 p-3">
              <h4 class="font-semibold">${student.name}</h4>
              <p class="text-sm text-muted">${[student.role || "Main Student", student.class, student.section ? ` ${student.section}` : ""].filter(Boolean).join(" - ")}</p>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;

  document.getElementById("initiativeContributors").innerHTML = initiative.contributors.map((person) => `
    <article class="initiative-person">
      <h3 class="font-semibold">${person.name}</h3>
      <p class="text-sm text-muted">${person.role}</p>
    </article>
  `).join("");

  document.getElementById("initiativeExecution").innerHTML = initiative.execution.map((phase, index) => {
    const toneClass = phase.status === "Completed" ? "status-pill-approved" : "status-pill-pending";
    return `
      <article class="analysis-card p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">${index + 1}. ${phase.phase}</h3>
          <span class="${toneClass} rounded-md px-2 py-0.5 text-[11px] font-semibold">${phase.status}</span>
        </div>
        <p class="mt-2 text-sm text-muted">${phase.note}</p>
      </article>
    `;
  }).join("");

  initRevealObserver();
}

initTheme();
initInitiativePage();
