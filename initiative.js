function renderLeadCard(initiative) {
  const lead = initiative.lead || {};
  const leadIsCouncil = lead.type === "council";
  const leadStudents = Array.isArray(lead.mainStudents) ? lead.mainStudents.filter((student) => student && student.name) : [];
  const leadTitle = leadIsCouncil ? (lead.councilName || "Council Lead") : (lead.name || "Pending");
  const leadSubtitle = leadIsCouncil ? (lead.role || "Council Initiative Lead") : [lead.role, lead.class].filter(Boolean).join(" &middot; ");
  const icon = leadIsCouncil ? "&#128101;" : (leadTitle.charAt(0) || "L");

  return `
    <article class="initiative-lead-panel">
      <p class="initiative-lead-label">Initiative Lead</p>
      <div class="initiative-lead-header">
        <div class="initiative-lead-avatar" aria-hidden="true">${icon}</div>
        <div class="min-w-0">
          <h3 class="initiative-lead-title">${leadTitle}</h3>
          <p class="initiative-lead-subtitle">${leadSubtitle}</p>
        </div>
      </div>
      ${leadStudents.length ? `
        <div class="initiative-lead-students">
          ${leadStudents.map((student) => `
            <div class="initiative-lead-student">
              <div class="initiative-student-avatar" aria-hidden="true">${student.name?.charAt(0) || "S"}</div>
              <div class="min-w-0">
                <h4 class="initiative-student-name">${student.name}</h4>
                <p class="initiative-student-meta">${[student.role || "Main Student Lead", student.class, student.section].filter(Boolean).join(" &middot; ")}</p>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

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

  document.getElementById("initiativeLeadBlock").innerHTML = renderLeadCard(initiative);

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
