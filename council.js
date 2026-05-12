function initCouncilDetailPage() {
  const detailPage = document.getElementById("councilDetailPage");
  if (!detailPage) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("council") || "";
  const council = getCouncilBySlug(slug);

  const notFound = document.getElementById("detailNotFound");
  if (!council) {
    detailPage.querySelectorAll(".reveal").forEach((section) => section.classList.add("hidden"));
    notFound.classList.remove("hidden");
    return;
  }

  const themeProfile = getCouncilThemeProfile(council);
  const insight = buildStrategicInsights(council);
  const accent = council.color || "#5b8ef7";
  document.body.setAttribute("data-council-theme", themeProfile.key);
  document.documentElement.style.setProperty("--house-color", council.color || "#4e79db");
  document.documentElement.style.setProperty("--council-accent", accent);

  document.getElementById("detailCouncilName").textContent = council.name;
  document.getElementById("detailMission").textContent = council.mission;
  document.getElementById("detailHomepageLink").href = council.homepage;
  document.getElementById("themeChip").textContent = themeProfile.label;
  document.getElementById("healthChip").textContent = `Delivery Health ${insight.performance >= 85 ? "High" : insight.performance >= 70 ? "Stable" : "Needs Attention"}`;

  const metricBox = document.getElementById("detailMetrics");
  const metrics = [
    { label: "Performance", value: `${insight.performance} / 100` },
    { label: "Project Progress", value: `${council.mainProject.progress}%` },
    { label: "Approval Rate", value: `${insight.approvalRate}%` },
    { label: "Impact Score", value: `${council.impactScore}` },
    { label: "Active Initiatives", value: `${council.initiatives.length}` }
  ];
  metricBox.innerHTML = metrics.map((metric) => `<article class=\"detail-metric\"><p class=\"text-xs text-muted\">${metric.label}</p><p class=\"mt-1 text-xl font-bold\">${metric.value}</p></article>`).join("");

  document.getElementById("analysisSummary").textContent = `${themeProfile.descriptor} ${insight.summary}`;
  document.getElementById("strengthList").innerHTML = insight.strengths.map((item) => `<li>- ${item}</li>`).join("");
  document.getElementById("riskList").innerHTML = insight.risks.map((item) => `<li>- ${item}</li>`).join("");
  document.getElementById("focusList").innerHTML = insight.focus.map((item) => `<li>- ${item}</li>`).join("");

  const timelineRail = document.getElementById("timelineRail");
  const timeline = [
    { date: "2026-01-10", title: "Cycle Kickoff", note: `Council launched annual plan centered on ${council.mainProject.title}.` },
    { date: council.approved[0]?.dateApproved || "2026-02-01", title: "First Approval Milestone", note: `${council.approved[0]?.title || "Primary initiative"} passed review with teacher endorsement.` },
    { date: council.approved[1]?.dateApproved || "2026-03-01", title: "Scale and Execution", note: `${council.approved[1]?.title || "Secondary initiative"} entered structured rollout.` },
    { date: "2026-04-01", title: "Current Quarter Review", note: `Project progress now at ${council.mainProject.progress}% with focus on final execution quality.` }
  ];

  timelineRail.innerHTML = timeline.map((entry) => `
    <article class="timeline-item">
      <p class="timeline-date">${formatDate(entry.date)}</p>
      <div class="timeline-body">
        <h3 class="text-sm font-semibold">${entry.title}</h3>
        <p class="mt-1 text-sm text-muted">${entry.note}</p>
      </div>
    </article>
  `).join("");

  const padletBoard = document.getElementById("padletBoard");
  const notePool = [
    ...council.initiatives.map((initiative) => ({ title: initiative, body: "Student-led initiative currently tracked in council operations.", type: "Initiative" })),
    ...council.approved.map((item) => ({ title: item.title, body: `Teacher-approved on ${formatDate(item.dateApproved)}. ${item.rationale}`, type: "Approved" })),
    ...council.rejected.map((item) => ({ title: item.title, body: `Revision note: ${item.feedback}`, type: "Review" })),
    ...((council.proofs.images || []).map((image) => ({ title: image.title, body: "Visual proof uploaded to council evidence vault.", type: "Proof" })))
  ];

  padletBoard.innerHTML = notePool.slice(0, 12).map((note) => {
    const tone = note.type === "Approved"
      ? "background: color-mix(in srgb, var(--ok) 16%, var(--surface-strong));"
      : note.type === "Review"
        ? "background: color-mix(in srgb, var(--danger) 10%, var(--surface-strong));"
        : "";

    return `
      <article class="padlet-note" style="${tone}">
        <h4>${note.title}</h4>
        <p>${note.body}</p>
        <span class="padlet-tag">${note.type}</span>
      </article>
    `;
  }).join("");

  const pendingPipeline = document.getElementById("pendingPipeline");
  if (pendingPipeline) {
    pendingPipeline.innerHTML = (council.pendingInitiatives || []).map((item) => `
      <article class="pipeline-card">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">${item.title}</h3>
          <span class="status-pill-pending rounded-md px-2 py-0.5 text-[11px] font-semibold">Pending</span>
        </div>
        <p class="mt-1 text-xs text-muted">Owner: ${item.owner} · <a class="initiative-link" href="initiative.html?council=${encodeURIComponent(slug)}&initiative=${encodeURIComponent(item.id)}">Open Initiative Details</a></p>
        <div class="mt-3 pipeline-rail">
          <article class="pipeline-stage">
            <p class="pipeline-stage-title">Planning</p>
            <div class="pipeline-progress planning"><span style="width:${item.planning}%"></span></div>
            <p class="mt-1 text-[11px] text-muted">${item.planning}% complete</p>
          </article>
          <article class="pipeline-stage">
            <p class="pipeline-stage-title">Execution</p>
            <div class="pipeline-progress execution"><span style="width:${item.execution}%"></span></div>
            <p class="mt-1 text-[11px] text-muted">${item.execution}% complete</p>
          </article>
          <article class="pipeline-stage">
            <p class="pipeline-stage-title">Feedback</p>
            <div class="pipeline-progress feedback"><span style="width:${item.feedback}%"></span></div>
            <p class="mt-1 text-[11px] text-muted">${item.feedback}% complete</p>
          </article>
        </div>
      </article>
    `).join("");
  }

  function matchDateFilter(dateValue, filter) {
    if (filter === "all") return true;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date("2026-04-15T00:00:00");
    if (filter === "date") {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    }
    if (filter === "year") return date.getFullYear() === now.getFullYear();
    if (filter === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  const approvedGrid = document.getElementById("approvedGrid");
  const rejectedList = document.getElementById("rejectedList");
  const approvedFilter = document.getElementById("approvedFilter");
  const rejectedFilter = document.getElementById("rejectedFilter");

  function renderApproved() {
    const filter = approvedFilter ? approvedFilter.value : "all";
    approvedGrid.innerHTML = council.approved
      .filter((item) => matchDateFilter(item.dateApproved, filter))
      .map((item) => `
        <article class="analysis-card p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs uppercase tracking-wide text-muted">Approved</p>
            <span class="status-pill-approved rounded-md px-2 py-0.5 text-[11px] font-semibold">Passed</span>
          </div>
          <h3 class="mt-2 font-semibold">${item.title}</h3>
          <p class="mt-2 text-xs text-muted">Date Approved: ${formatDate(item.dateApproved)}</p>
          <p class="mt-2 text-sm text-muted">Rationale: ${item.rationale}</p>
          <p class="mt-2 text-sm"><a class="initiative-link" href="initiative.html?council=${encodeURIComponent(slug)}&initiative=${encodeURIComponent(item.initiativeId)}">View Initiative Lead and Contributors</a></p>
        </article>
      `).join("");
  }

  function renderRejected() {
    const filter = rejectedFilter ? rejectedFilter.value : "all";
    rejectedList.innerHTML = council.rejected
      .filter((item) => matchDateFilter(item.dateProposed, filter))
      .map((item) => `
        <article class="analysis-card p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold">${item.title}</h3>
            <span class="status-pill-rejected rounded-md px-2 py-0.5 text-[11px] font-semibold">Non-Approved</span>
          </div>
          <p class="mt-2 text-xs text-muted">Date Proposed: ${formatDate(item.dateProposed)}</p>
          <p class="mt-2 text-sm text-muted">Teacher Feedback: ${item.feedback}</p>
          <p class="mt-2 text-sm"><a class="initiative-link" href="initiative.html?council=${encodeURIComponent(slug)}&initiative=${encodeURIComponent(item.initiativeId)}">Open Initiative Remediation Plan</a></p>
        </article>
      `).join("");
  }

  renderApproved();
  renderRejected();
  if (approvedFilter) approvedFilter.addEventListener("change", renderApproved);
  if (rejectedFilter) rejectedFilter.addEventListener("change", renderRejected);

  const calendarLegend = document.getElementById("calendarLegend");
  const calendarViewControls = document.getElementById("calendarViewControls");
  const calendarYearControls = document.getElementById("calendarYearControls");
  const calendarMonthControls = document.getElementById("calendarMonthControls");
  const initiativeCalendar = document.getElementById("initiativeCalendar");
  const calendarDialog = document.getElementById("calendarDialog");
  const calendarDialogTitle = document.getElementById("calendarDialogTitle");
  const calendarDialogBody = document.getElementById("calendarDialogBody");

  const eventTypes = [
    { key: "Workshop", className: "workshop", color: "#4f7ce6" },
    { key: "Review", className: "review", color: "#d78b29" },
    { key: "Showcase", className: "showcase", color: "#2f9f5d" }
  ];

  function eventTypeClass(type) {
    const found = eventTypes.find((item) => item.key === type);
    return found ? found.className : "workshop";
  }

  if (calendarLegend) {
    calendarLegend.innerHTML = eventTypes
      .map((item) => `<span class="event-chip ${item.className}"><span class="inline-block h-2 w-2 rounded-full mr-1.5" style="background:${item.color}"></span>${item.key}</span>`)
      .join("");
  }

  if (initiativeCalendar) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const events = council.calendarEvents || [];
    const years = [...new Set(events.map((event) => new Date(event.date).getFullYear()))].sort((a, b) => a - b);
    let selectedYear = years[0] || new Date().getFullYear();
    let selectedMonth = new Date().getMonth();
    let selectedView = "year";

    if (calendarViewControls) {
      calendarViewControls.innerHTML = `
        <div class="calendar-view-toggle">
          <button id="calendarYearView" class="active">Yearly View</button>
          <button id="calendarMonthView">Monthly View</button>
        </div>
      `;
    }

    if (calendarYearControls) {
      calendarYearControls.innerHTML = `
        <div class="calendar-toolbar">
          <button id="calendarPrevYear" class="rounded-lg border px-3 py-1.5 text-xs font-semibold border-theme surface-strong">Previous Year</button>
          <p id="calendarYearLabel" class="calendar-year-label"></p>
          <button id="calendarNextYear" class="rounded-lg border px-3 py-1.5 text-xs font-semibold border-theme surface-strong">Next Year</button>
        </div>
      `;
    }

    if (calendarMonthControls) {
      calendarMonthControls.innerHTML = `
        <div class="calendar-toolbar hidden" id="calendarMonthToolbar">
          <button id="calendarPrevMonth" class="rounded-lg border px-3 py-1.5 text-xs font-semibold border-theme surface-strong">Previous Month</button>
          <p id="calendarMonthLabel" class="calendar-year-label"></p>
          <button id="calendarNextMonth" class="rounded-lg border px-3 py-1.5 text-xs font-semibold border-theme surface-strong">Next Month</button>
        </div>
      `;
    }

    const yearLabel = document.getElementById("calendarYearLabel");
    const prevYearBtn = document.getElementById("calendarPrevYear");
    const nextYearBtn = document.getElementById("calendarNextYear");
    const yearViewBtn = document.getElementById("calendarYearView");
    const monthViewBtn = document.getElementById("calendarMonthView");
    const monthToolbar = document.getElementById("calendarMonthToolbar");
    const monthLabel = document.getElementById("calendarMonthLabel");
    const prevMonthBtn = document.getElementById("calendarPrevMonth");
    const nextMonthBtn = document.getElementById("calendarNextMonth");

    function eventDateKey(value) {
      const date = new Date(value);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    function renderEventPopup(dayEvents, year, month, day) {
      calendarDialogTitle.textContent = `Initiatives on ${monthNames[month - 1]} ${day}, ${year}`;
      calendarDialogBody.innerHTML = dayEvents.map((event) => `
        <article class="analysis-card p-3">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-semibold">${event.title}</h4>
            <span class="event-chip ${eventTypeClass(event.type)}">${event.type}</span>
          </div>
          <p class="mt-2 text-sm text-muted">${event.description}</p>
          <p class="mt-2 text-sm"><a class="initiative-link" href="initiative.html?council=${encodeURIComponent(slug)}&initiative=${encodeURIComponent(event.initiativeId)}">Open detailed initiative page</a></p>
        </article>
      `).join("");
      calendarDialog.showModal();
    }

    function renderCalendarYear() {
      const yearEvents = events.filter((event) => new Date(event.date).getFullYear() === selectedYear);
      const eventMap = new Map();
      yearEvents.forEach((event) => {
        const key = eventDateKey(event.date);
        const existing = eventMap.get(key) || [];
        existing.push(event);
        eventMap.set(key, existing);
      });

      if (yearLabel) yearLabel.textContent = `${selectedYear} Full-Year Initiative Calendar`;
      if (prevYearBtn) prevYearBtn.disabled = selectedYear <= (years[0] || selectedYear);
      if (nextYearBtn) nextYearBtn.disabled = selectedYear >= (years[years.length - 1] || selectedYear);

      const monthBlocks = monthNames.map((monthName, monthIndex) => {
        const firstDay = new Date(selectedYear, monthIndex, 1).getDay();
        const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
        const cells = [];

        for (let i = 0; i < firstDay; i += 1) {
          cells.push("<div class=\"calendar-day empty\"></div>");
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
          const key = `${selectedYear}-${monthIndex}-${day}`;
          const dayEvents = eventMap.get(key) || [];
          const first = dayEvents[0];
          const firstType = first ? eventTypeClass(first.type) : "";
          cells.push(`
            <button class="calendar-day ${dayEvents.length ? `has-event type-${firstType}` : ""}" data-date="${selectedYear}-${monthIndex + 1}-${day}">
              <div class="flex items-center justify-between text-xs"><span>${day}</span>${dayEvents.length ? `<span class="calendar-dot ${firstType}"></span>` : ""}</div>
              <p class="calendar-day-title">${first ? first.title : ""}</p>
              ${dayEvents.length > 1 ? `<p class="text-[10px] text-muted">+${dayEvents.length - 1} more</p>` : ""}
            </button>
          `);
        }

        return `
          <article class="calendar-month">
            <h3 class="calendar-month-title">${monthName}</h3>
            <div class="calendar-weekdays">${shortDays.map((dayName) => `<span>${dayName}</span>`).join("")}</div>
            <div class="calendar-grid month">${cells.join("")}</div>
          </article>
        `;
      }).join("");

      initiativeCalendar.innerHTML = `<div class="calendar-year-grid">${monthBlocks}</div>`;

      initiativeCalendar.querySelectorAll(".calendar-day.has-event").forEach((button) => {
        button.addEventListener("click", () => {
          const [year, month, day] = button.dataset.date.split("-").map(Number);
          const key = `${year}-${month - 1}-${day}`;
          const dayEvents = eventMap.get(key) || [];
          renderEventPopup(dayEvents, year, month, day);
        });
      });
    }

    function renderCalendarMonth() {
      const monthEvents = events.filter((event) => {
        const date = new Date(event.date);
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      });
      const eventMap = new Map();
      monthEvents.forEach((event) => {
        const key = eventDateKey(event.date);
        const existing = eventMap.get(key) || [];
        existing.push(event);
        eventMap.set(key, existing);
      });

      if (monthLabel) monthLabel.textContent = `${monthNames[selectedMonth]} ${selectedYear}`;

      const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < firstDay; i += 1) {
        cells.push("<div class=\"calendar-day empty\"></div>");
      }
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${selectedYear}-${selectedMonth}-${day}`;
        const dayEvents = eventMap.get(key) || [];
        const first = dayEvents[0];
        const firstType = first ? eventTypeClass(first.type) : "";
        cells.push(`
          <button class="calendar-day ${dayEvents.length ? `has-event type-${firstType}` : ""}" data-date="${selectedYear}-${selectedMonth + 1}-${day}">
            <div class="flex items-center justify-between text-xs"><span>${day}</span>${dayEvents.length ? `<span class="calendar-dot ${firstType}"></span>` : ""}</div>
            <p class="calendar-day-title">${first ? first.title : ""}</p>
            ${dayEvents.length > 1 ? `<p class="text-[10px] text-muted">+${dayEvents.length - 1} more</p>` : ""}
          </button>
        `);
      }

      initiativeCalendar.innerHTML = `
        <article class="calendar-month">
          <div class="calendar-weekdays">${shortDays.map((dayName) => `<span>${dayName}</span>`).join("")}</div>
          <div class="calendar-grid month">${cells.join("")}</div>
        </article>
      `;

      initiativeCalendar.querySelectorAll(".calendar-day.has-event").forEach((button) => {
        button.addEventListener("click", () => {
          const [year, month, day] = button.dataset.date.split("-").map(Number);
          const key = `${year}-${month - 1}-${day}`;
          const dayEvents = eventMap.get(key) || [];
          renderEventPopup(dayEvents, year, month, day);
        });
      });
    }

    function renderCalendar() {
      const yearToolbar = calendarYearControls ? calendarYearControls.querySelector(".calendar-toolbar") : null;
      if (selectedView === "year") {
        if (yearToolbar) yearToolbar.classList.remove("hidden");
        if (monthToolbar) monthToolbar.classList.add("hidden");
        if (yearViewBtn) yearViewBtn.classList.add("active");
        if (monthViewBtn) monthViewBtn.classList.remove("active");
        renderCalendarYear();
      } else {
        if (yearToolbar) yearToolbar.classList.add("hidden");
        if (monthToolbar) monthToolbar.classList.remove("hidden");
        if (yearViewBtn) yearViewBtn.classList.remove("active");
        if (monthViewBtn) monthViewBtn.classList.add("active");
        renderCalendarMonth();
      }
    }

    renderCalendar();
    if (prevYearBtn) {
      prevYearBtn.addEventListener("click", () => {
        if (selectedYear <= (years[0] || selectedYear)) return;
        selectedYear -= 1;
        renderCalendar();
      });
    }
    if (nextYearBtn) {
      nextYearBtn.addEventListener("click", () => {
        if (selectedYear >= (years[years.length - 1] || selectedYear)) return;
        selectedYear += 1;
        renderCalendar();
      });
    }
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener("click", () => {
        if (selectedMonth === 0) {
          if (selectedYear <= (years[0] || selectedYear)) return;
          selectedYear -= 1;
          selectedMonth = 11;
        } else {
          selectedMonth -= 1;
        }
        renderCalendar();
      });
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener("click", () => {
        if (selectedMonth === 11) {
          if (selectedYear >= (years[years.length - 1] || selectedYear)) return;
          selectedYear += 1;
          selectedMonth = 0;
        } else {
          selectedMonth += 1;
        }
        renderCalendar();
      });
    }
    if (yearViewBtn) {
      yearViewBtn.addEventListener("click", () => {
        selectedView = "year";
        renderCalendar();
      });
    }
    if (monthViewBtn) {
      monthViewBtn.addEventListener("click", () => {
        selectedView = "month";
        renderCalendar();
      });
    }
  }

  const proofImageGallery = document.getElementById("proofImageGallery");
  proofImageGallery.innerHTML = (council.proofs.images || []).map((image, index) => `
    <figure class="playful-tile proof-tile" style="animation-delay: ${index * 0.06}s">
      <img src="${image.url}" alt="${image.title}" loading="lazy" />
      <figcaption class="proof-meta"><strong>${image.title}</strong><p>Captured as execution evidence for council review documentation.</p></figcaption>
    </figure>
  `).join("");

  const proofVideoGrid = document.getElementById("proofVideoGrid");
  proofVideoGrid.innerHTML = (council.proofs.videos || []).map((video) => `
    <article class="analysis-card p-3">
      <p class="mb-2 text-sm font-semibold">${video.title}</p>
      <video class="media-thumb h-[210px]" controls preload="metadata">
        <source src="${video.url}" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </article>
  `).join("");

  initRevealObserver();
}

initTheme();
initCouncilDetailPage();