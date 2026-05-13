const sharedProofVideos = [
  {
    title: "Student Feedback Reel",
    url: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    title: "Pilot Initiative Highlights",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  }
];

const API_BASE = "https://councilhub-backend.oois-cip-official.workers.dev/api";
const COUNCIL_CACHE_KEY = "cip_council_cache_v5";

let councilData = {
  liveStatus: {
    message: "Syncing with cloud...",
    mode: "Healthy"
  },
  academicCouncils: [],
  houseCouncils: []
};

let allCouncils = [];

function calculateImpactScore(data) {
  const initiatives = data?.initiatives || data?.initiativeDetails || [];
  const approved = data?.approvedList || data?.approved || initiatives.filter((i) => i.status === "approved");
  const successful = data?.successfulInitiatives || initiatives.filter((i) => i.isSuccessful === true || i.isSuccessful === 1 || i.isSuccessful === "1");
  const rejected = data?.rejectedList || data?.rejected || initiatives.filter((i) => i.status === "rejected");
  const rawBase = Number(data?.baseScore ?? data?.info?.baseScore ?? 0);
  const base = Number.isFinite(rawBase) ? Math.min(50, Math.max(0, rawBase)) : 0;

  const activity = Math.min(initiatives.length * 0.5, 10);
  const approval = Math.min(approved.length * 1.0, 10);
  const execution = Math.min(successful.length * 3.0, 30);
  const rejectionPenalty = Math.min(rejected.length * 1.5, 15);

  const today = new Date().toISOString().split("T")[0];
  const overduePenalty = initiatives.filter((i) =>
    i.executionDate &&
    i.executionDate < today &&
    !(i.isSuccessful === true || i.isSuccessful === 1 || i.isSuccessful === "1")
  ).length * 2;

  const inactivityPenalty = initiatives.length === 0 ? 5 : 0;
  const score = base + activity + approval + execution - rejectionPenalty - overduePenalty - inactivityPenalty;

  return Math.min(100, Math.max(0, Math.round(score)));
}

async function enrichCouncilData() {
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingProgress = document.getElementById("loadingProgress");
  const loadingStatus = document.getElementById("loadingStatus");
  ["cip_council_cache", "cip_council_cache_v2", "cip_council_cache_v3", "cip_council_cache_v4"]
    .forEach((key) => localStorage.removeItem(key));

  function updateLoading(percent, status) {
    if (loadingProgress) loadingProgress.style.width = `${percent}%`;
    if (loadingStatus) loadingStatus.textContent = status;
  }

  const statusUpdate = (msg) => {
    councilData.liveStatus.message = msg;
    const el = document.getElementById("liveStatusText");
    if (el) el.textContent = msg;
  };

  // 1. Try to load from Local Cache (instant render)
  const cachedData = localStorage.getItem(COUNCIL_CACHE_KEY);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      // If cache is less than 5 minutes old, we can skip the initial loading UI
      if (now - parsed.timestamp < 300000) {
        allCouncils = parsed.data;
        councilData.academicCouncils = allCouncils.filter(c => !c.id.includes("house") && !c.name.toLowerCase().includes("house"));
        councilData.houseCouncils = allCouncils.filter(c => c.id.includes("house") || c.name.toLowerCase().includes("house"));
        if (loadingOverlay) loadingOverlay.style.display = "none";
        statusUpdate("Loaded from Local Cache");
      }
    } catch (e) {
      console.warn("Local cache corrupt, fetching fresh...");
    }
  }

  try {
    statusUpdate("Synchronizing Registry...");
    updateLoading(20, "Fetching aggregate data package...");
    
    // 2. Fetch the "Super-Aggregate" payload (replaces 14+ individual calls)
    const res = await fetch(`${API_BASE}/councils/full?cb=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error("Registry aggregate unreachable");
    
    const fullData = await res.json();
    const ids = Object.keys(fullData);
    
    updateLoading(60, "Processing institutional data...");

    const results = ids.map((id) => {
      const d = fullData[id];
      const processed = {
        id: id,
        name: d.info?.name || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        color: d.info?.color || "#4e79db",
        homepage: d.info?.homepage || "#",
        mission: d.info?.mission || "Mission pending...",
        achievement: d.info?.achievement || "No major achievements yet.",
        impactScore: calculateImpactScore(d),
        initiatives: (d.initiatives || []).map(i => i.title),
        initiativeDetails: d.initiatives || [],
        pendingInitiatives: d.pendingList || [],
        mainProject: {
          title: d.mainProject?.title || "No Active Project",
          progress: d.mainProject?.progress || 0,
          status: d.mainProject?.status || "Not Started"
        },
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.info?.name || id)}&background=random&color=fff`,
        approved: d.approvedList || [],
        rejected: d.rejectedList || [],
        calendarEvents: d.calendarEvents || [],
        padlets: d.padlets || {},
        strategicAnalysis: d.strategicAnalysis || null,
        timelineEvents: d.timelineEvents || []
      };
      return processed;
    });

    allCouncils = results;
    councilData.academicCouncils = allCouncils.filter(c => !c.id.includes("house") && !c.name.toLowerCase().includes("house"));
    councilData.houseCouncils = allCouncils.filter(c => c.id.includes("house") || c.name.toLowerCase().includes("house"));
    
    // 3. Save to Local Cache for next visit
    localStorage.setItem(COUNCIL_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: allCouncils
    }));

    statusUpdate(`${allCouncils.length} councils synced`);
    updateLoading(100, "Core Systems Ready");
    
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = "0";
            setTimeout(() => {
                loadingOverlay.style.display = "none";
            }, 700);
        }
    }, 400);

    return true;
  } catch (error) {
    console.error("Aggregation sync failed:", error);
    statusUpdate("Sync degraded · Using fallback");
    if (loadingOverlay) loadingOverlay.style.display = "none";
    return false;
  }
}



const academicGrid = document.getElementById("academicGrid");
const houseGrid = document.getElementById("houseGrid");
const rankingList = document.getElementById("rankingList");
const topCouncilBanner = document.getElementById("topCouncilBanner");
const chartArea = document.getElementById("chartArea");
let activeChartType = "pie";

const feedbackDialog = document.getElementById("feedbackDialog");
const feedbackTitle = document.getElementById("feedbackTitle");
const councilInput = document.getElementById("councilInput");

function getStatusTone(status) {
  if (status === "Completed") return "var(--ok)";
  if (status === "In Progress") return "#4f7ce6";
  return "var(--warn)";
}

function statusClass(status) {
  if (status === "Completed") return "completed";
  if (status === "In Progress") return "in-progress";
  return "pending";
}

function getHouseColorByName(council) {
  if (council.color) return council.color;
  const house = (council.house || council.name || "").toLowerCase();
  if (house.includes("aquarius")) return "#2d7de8";
  if (house.includes("aries")) return "#d94343";
  if (house.includes("leo")) return "#e09a24";
  if (house.includes("taurus")) return "#239c64";
  return "#4e79db";
}

function createCouncilCard(council, isHouse = false) {
  const card = document.createElement("article");
  card.className = `glass reveal council-card rounded-2xl border p-4 md:p-5 ${isHouse ? "house-accent" : ""}`;
  if (isHouse) card.style.setProperty("--house-color", getHouseColorByName(council));
  card.setAttribute("tabindex", "0");

  const initiativeMarkup = council.initiatives
    .slice(0, 2)
    .map((initiative) => `<li class=\"text-sm text-muted\">${initiative}</li>`)
    .join("");

  const statusColor = getStatusTone(council.mainProject.status);
card.innerHTML = `
  <div class="flex items-start gap-3">
    
    <!-- Logo -->
    <div class="logo-wrapper">
      <img src="${council.logo}" alt="${council.name} logo" class="logo-img" />
    </div>

    <!-- Title + Status -->
    <div class="flex-1 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold md:text-lg ${isHouse ? "house-name" : ""}">
          ${council.name}
        </h3>
        <p class="mt-1 text-xs text-muted">
          Main Project: ${council.mainProject.title}
        </p>
      </div>

      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style="background: color-mix(in srgb, ${statusColor} 18%, transparent);
               color: ${statusColor};
               border: 1px solid color-mix(in srgb, ${statusColor} 35%, var(--border));">
        ${council.mainProject.status}
      </span>
    </div>
  </div>

  <div class="mt-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-muted">
      Initiative Tracker
    </p>
    <ul class="mt-2 list-disc space-y-1 pl-5">
      ${initiativeMarkup}
    </ul>
  </div>

  <div class="mt-4">
    <div class="mb-1 flex items-center justify-between text-xs">
      <span class="text-muted">Effort Tracker</span>
      <span class="font-semibold">${council.mainProject.progress}%</span>
    </div>
    <div class="progress-track h-2.5 overflow-hidden rounded-full">
      <div class="progress-fill ${statusClass(council.mainProject.status)} h-full rounded-full"
           style="width: ${council.mainProject.progress}%"></div>
    </div>
  </div>

  <div class="mt-4 flex items-center justify-between gap-2">
    <p class="rounded-md border border-theme px-2.5 py-1 text-xs surface-input">
      Recent Achievement: ${council.achievement}
    </p>
  </div>

  <div class="mt-4 flex items-center justify-between gap-2">
    <span class="text-xs text-muted">
      Impact Score: <strong class="text-theme">${council.impactScore}</strong>
    </span>
    <button class="feedback-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-white btn-accent"
            data-council="${council.name}">
      Give Feedback
    </button>
  </div>
`;

  const openLink = () => { 
    window.location.href = `council.html?council=${encodeURIComponent(toSlug(council.name))}`; 
  };
  card.addEventListener("click", (event) => {
    if (event.target.closest(".feedback-btn")) return;
    openLink();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openLink();
  });

  return card;
}

function renderCouncils() {
  councilData.academicCouncils.forEach((council) => academicGrid.appendChild(createCouncilCard(council)));
  councilData.houseCouncils.forEach((council) => houseGrid.appendChild(createCouncilCard(council, true)));
}

function animateCount(el, target) {
  const duration = 900;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderHeroStats() {
  const heroStats = document.getElementById("heroStats");
  if (!heroStats) return;
  heroStats.innerHTML = "";

  if (!allCouncils || allCouncils.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "col-span-full py-4 text-center text-xs text-muted/50 italic";
    placeholder.textContent = "Syncing institutional metrics...";
    heroStats.appendChild(placeholder);
    return;
  }

  const totalCouncils = allCouncils.length;
  const completed = allCouncils.filter((c) => c.mainProject?.status === "Completed").length;
  const avgProgress = Math.round(allCouncils.reduce((sum, c) => sum + (c.mainProject?.progress || 0), 0) / totalCouncils);
  const best = [...allCouncils].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))[0];

  const stats = [
    { label: "Total Councils", value: totalCouncils },
    { label: "Completed Projects", value: completed },
    { label: "Avg. Effort", value: avgProgress, suffix: "%" },
    { label: "Top Council", text: best ? best.name.split(" ")[0] : "---" }
  ];

  stats.forEach((stat) => {
    const box = document.createElement("div");
    box.className = "rounded-xl border border-theme px-3 py-3 reveal";
    box.style.background = "color-mix(in srgb, var(--surface) 66%, transparent)";

    if (stat.text) {
      box.innerHTML = `<p class="text-xs text-muted">${stat.label}</p><p class="mt-1 text-lg font-semibold">${stat.text}</p>`;
    } else {
      box.innerHTML = `<p class="text-xs text-muted">${stat.label}</p><p class="mt-1 text-lg font-semibold"><span class="count">0</span>${stat.suffix || ""}</p>`;
      animateCount(box.querySelector(".count"), stat.value);
    }

    heroStats.appendChild(box);
  });
}

function councilPerformance(council) {
  const completionBoost = council.mainProject.status === "Completed" ? 8 : 0;
  return Math.min(100, Math.round(council.mainProject.progress * 0.6 + council.impactScore * 0.4 + completionBoost));
}

function getSortedCouncilData() {
  return [...allCouncils]
    .sort((a, b) => b.impactScore - a.impactScore);
}

function toSlug(name) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getCouncilBySlug(slug) {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug);
  return allCouncils.find((c) => toSlug(c.name) === decoded || c.id === decoded);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getCouncilThemeProfile(council) {
  const name = council.name.toLowerCase();
  if (name.includes("literary")) return { key: "literary", label: "Literacy Studio Theme", descriptor: "" };
  if (name.includes("innovation")) return { key: "innovation", label: "Future Lab Theme", descriptor: "" };
  if (name.includes("environment")) return { key: "environment", label: "Eco Systems Theme", descriptor: "" };
  if (name.includes("sports")) return { key: "sports", label: "Performance Arena Theme", descriptor: "" };
  if (name.includes("cultural")) return { key: "cultural", label: "Culture Mosaic Theme", descriptor: "" };
  if (name.includes("wellbeing")) return { key: "wellbeing", label: "Wellness Circle Theme", descriptor: "" };
  if (name.includes("media")) return { key: "media", label: "Newsroom Theme", descriptor: "" };
  if (name.includes("discipline")) return { key: "discipline", label: "Command Center Theme", descriptor: "" };
  if (name.includes("academic")) return { key: "academic", label: "Scholastic Ops Theme", descriptor: "" };
  if (name.includes("house")) return { key: "house", label: "House Identity Theme", descriptor: "" };
  return { key: "academic", label: "Council Studio Theme", descriptor: "" };
}

function buildStrategicInsights(council) {
  const approvedCount = council.approved.length;
  const rejectedCount = council.rejected.length;
  const approvalRate = Math.round((approvedCount / (approvedCount + rejectedCount)) * 100) || 0;
  const performance = councilPerformance(council);

  // Use custom analysis if available, otherwise fallback to auto-generated
  if (council.strategicAnalysis && council.strategicAnalysis.summary && council.strategicAnalysis.summary !== "Strategic overview pending manager analysis.") {
    try {
      return {
        approvalRate,
        performance,
        strengths: JSON.parse(council.strategicAnalysis.strengths || "[]"),
        risks: JSON.parse(council.strategicAnalysis.risks || "[]"),
        focus: JSON.parse(council.strategicAnalysis.focus || "[]"),
        summary: council.strategicAnalysis.summary
      };
    } catch (e) {
      console.warn("Analysis parse failed:", e);
    }
  }

  const strengths = [
    `${council.mainProject.progress}% completion on ${council.mainProject.title}.`,
    `${approvedCount} initiatives approved by teachers in current cycle.`,
    `Recent win: ${council.achievement}.`
  ];

  const risks = [
    `${rejectedCount} proposals require redesign before next review board.`,
    `Delivery risk if approval rate stays below ${Math.max(70, approvalRate)}%.`,
    `Cross-team dependency watch on initiative: ${council.initiatives[0] || 'TBD'}.`
  ];

  const focus = [
    `30 days: tighten proposal quality rubric around measurable outcomes.`,
    `60 days: convert 1 rejected item into pilot-ready revision.`,
    `90 days: raise composite performance from ${performance} to ${Math.min(100, performance + 6)}.`
  ];

  return {
    approvalRate,
    performance,
    strengths,
    risks,
    focus,
    summary: `${council.name} is operating at a performance score of ${performance}/100 with an approval rate of ${approvalRate || 0}%. The council is strongest in execution momentum and visible outcomes, while proposal quality consistency remains the key lever for next-cycle growth.`
  };
}

function renderRanking() {
  const el = document.getElementById("rankingList");
  if (!el) return;
  el.innerHTML = "";
  
  const ranked = getSortedCouncilData();
  ranked.forEach((council, index) => {
    const item = document.createElement("li");
    item.className = "reveal";
    item.style.animationDelay = `${index * 0.05}s`;

    const scoreColor = council.impactScore >= 80 ? "text-green-400" : council.impactScore >= 60 ? "text-blue-400" : "text-amber-400";
    
    item.innerHTML = `
      <a class="group block rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-white/10" href="council.html?council=${encodeURIComponent(toSlug(council.name))}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xs font-black text-muted/30 w-4">${index + 1}</span>
            <span class="text-sm font-bold text-white group-hover:text-accent transition-colors">${council.name}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-muted/40">Impact</span>
            <span class="text-lg font-black ${scoreColor}">${council.impactScore}</span>
          </div>
        </div>
      </a>
    `;

    el.appendChild(item);
  });
}



function positionChartTooltip(event, tooltip) {
  const areaRect = chartArea.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = Math.min(Math.max(8, event.clientX - areaRect.left + 12), areaRect.width - tooltipRect.width - 8);
  const top = Math.min(Math.max(8, event.clientY - areaRect.top - tooltipRect.height - 12), areaRect.height - tooltipRect.height - 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showChartTooltip(event, content) {
  const tooltip = document.getElementById("chartTooltip");
  if (!tooltip) return;
  tooltip.innerHTML = content;
  tooltip.classList.add("visible");
  positionChartTooltip(event, tooltip);
}

function hideChartTooltip() {
  const tooltip = document.getElementById("chartTooltip");
  if (tooltip) tooltip.classList.remove("visible");
}


function initBarChartHover() {
  chartArea.querySelectorAll(".bar-segment").forEach((bar) => {
    bar.addEventListener("mousemove", (event) => {
      showChartTooltip(event, `<p class=\"font-semibold\">${bar.dataset.name}</p><p class=\"text-muted\">Performance: <strong class=\"text-theme\">${bar.dataset.performance}</strong></p><p class=\"text-muted\">Effort: <strong class=\"text-theme\">${bar.dataset.progress}%</strong></p><p class=\"text-muted\">Impact: <strong class=\"text-theme\">${bar.dataset.impact}</strong></p>`);
    });
    bar.addEventListener("mouseleave", hideChartTooltip);
  });
}



function bindFeedbackHandlers() {
  const dialog = document.getElementById("feedbackDialog");
  const cancelBtn = document.getElementById("cancelFeedback");
  const form = document.getElementById("feedbackForm");
  
  if (!dialog || !cancelBtn || !form) return;

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest(".feedback-btn");
    if (!button) return;
    event.stopPropagation();
    if (councilInput) councilInput.value = button.dataset.council;
    if (feedbackTitle) feedbackTitle.textContent = `Feedback for ${button.dataset.council}`;
    dialog.showModal();
  });

  cancelBtn.addEventListener("click", () => dialog.close());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const val = councilInput ? councilInput.value : "Council";
    alert(`Thanks. Feedback submitted for ${val}.`);
    event.target.reset();
    dialog.close();
  });
}

function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("council-theme", theme);
  if (chartArea) setChart(activeChartType);
}

function initTheme() {
  const saved = localStorage.getItem("council-theme") || "dark";
  setTheme(saved);
  const toggle = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  const desktopToggle = document.getElementById("themeToggle");
  const mobileToggle = document.getElementById("mobileThemeToggle");
  if (desktopToggle) desktopToggle.addEventListener("click", toggle);
  if (mobileToggle) mobileToggle.addEventListener("click", toggle);
}

function initHeroAnimation() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  const heroSection = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  let particles = [];
  let animationFrame;

  function resize() {
    canvas.width = heroSection.clientWidth;
    canvas.height = heroSection.clientHeight;
    const count = Math.max(28, Math.floor(canvas.width / 34));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5b8ef7";

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.42;
      ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 96) {
          ctx.beginPath();
          ctx.globalAlpha = (1 - distance / 96) * 0.18;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    animationFrame = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationFrame));
}

async function initDashboardPage() {
  const liveStatusText = document.getElementById("liveStatusText");
  if (liveStatusText) liveStatusText.textContent = `Live Status: ${councilData.liveStatus.message}`;
  
  renderCouncils();
  renderHeroStats();
  renderRanking();
  setChart("pie");
  bindFeedbackHandlers();
  
  await renderActivityFeed();

  document.querySelectorAll(".chart-toggle").forEach((btn) => {
    btn.addEventListener("click", () => setChart(btn.dataset.chart));
  });

  initRevealObserver();
  initHeroAnimation();
}

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
  if (metricBox) {
    const metrics = [
      { label: "Impact Score", value: `${council.impactScore}` },
      { label: "Active Initiatives", value: `${council.initiatives.length}` }
    ];
    metricBox.innerHTML = metrics.map((metric) => `
      <article class="detail-metric border border-white/5 bg-white/[0.02] p-4 rounded-xl">
        <p class="text-xs text-muted uppercase tracking-wider font-bold">${metric.label}</p>
        <p class="mt-2 text-2xl font-black text-white">${metric.value}</p>
      </article>
    `).join("");
  }

  const analysisSummary = document.getElementById("analysisSummary");
  if (analysisSummary) analysisSummary.textContent = `${themeProfile.descriptor} ${insight.summary}`;
  
  const strengthList = document.getElementById("strengthList");
  if (strengthList) strengthList.innerHTML = insight.strengths.map((item) => `<li>- ${item}</li>`).join("");
  
  const riskList = document.getElementById("riskList");
  if (riskList) riskList.innerHTML = insight.risks.map((item) => `<li>- ${item}</li>`).join("");
  
  const focusList = document.getElementById("focusList");
  if (focusList) focusList.innerHTML = insight.focus.map((item) => `<li>- ${item}</li>`).join("");

  const timelineRail = document.getElementById("timelineRail");
  if (timelineRail) {
    const timeline = (council.timelineEvents && council.timelineEvents.length > 0)
      ? council.timelineEvents
      : [
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
  }

  const padletBoard = document.getElementById("padletBoard");
  if (padletBoard) {
    if (council.padlets?.showcase) {
      padletBoard.innerHTML = `
      <br/>
        <div class="rounded-2xl overflow-hidden border border-white/10 h-[600px] bg-black/20 shadow-2xl">
          <iframe 
            src="${council.padlets.showcase}" 
            width="100%" 
            height="100%" 
            frameborder="0" 
            allow="camera;microphone;geolocation" 
            style="background: #000; border: none; display: block;"
            loading="lazy">
          </iframe>
        </div>
      `;
    } else {
      const notePool = [
        ...council.initiatives.map((initiative) => ({ title: initiative, body: "Student-led initiative currently tracked in council operations.", type: "Initiative" })),
        ...council.approved.map((item) => ({ title: item.title, body: `Teacher-approved on ${formatDate(item.dateApproved)}. ${item.rationale}`, type: "Approved" })),
        ...council.rejected.map((item) => ({ title: item.title, body: `Revision note: ${item.feedback}`, type: "Review" })),
        
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
    }
  }

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



  const calendarLegend = document.getElementById("calendarLegend");
  const calendarViewControls = document.getElementById("calendarViewControls");
  const calendarYearControls = document.getElementById("calendarYearControls");
  const calendarMonthControls = document.getElementById("calendarMonthControls");
  const initiativeCalendar = document.getElementById("initiativeCalendar");
  const calendarDialog = document.getElementById("calendarDialog");
  const calendarDialogTitle = document.getElementById("calendarDialogTitle");
  const calendarDialogBody = document.getElementById("calendarDialogBody");

  const eventTypes = [
    { key: "Pending", className: "pending", color: "#d78b29" },
    { key: "Completed", className: "completed", color: "#2f9f5d" }
  ];

  function eventTypeClass(type) {
    const found = eventTypes.find((item) => item.key === type);
    return found ? found.className : "pending";
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
    
    // Collect all unique years from events using UTC-safe parsing
    const years = [...new Set(
      events.map(e => { const p = parseEventDate(e.date); return p ? p.year : null; }).filter(Boolean)
    )].sort((a, b) => a - b);
    
    let selectedYear = years[0] || new Date().getFullYear();
    let selectedMonth = 11; // default December if no events
    let selectedView = events.length > 0 ? "month" : "year"; // default to month view if there are events

    // Auto-jump to first event's month
    if (events.length > 0) {
      const p = parseEventDate(events[0].date);
      if (p) { selectedYear = p.year; selectedMonth = p.month; }
    }

    if (calendarViewControls) {
      calendarViewControls.innerHTML = `
        <div class="calendar-view-toggle">
          <button id="calendarYearView" ${selectedView === 'year' ? 'class="active"' : ''}>Yearly View</button>
          <button id="calendarMonthView" ${selectedView === 'month' ? 'class="active"' : ''}>Monthly View</button>
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

    // Parse a date string safely, using UTC for YYYY-MM-DD format
    function parseEventDate(value) {
      if (!value) return null;
      // ISO date only (YYYY-MM-DD) — parse as UTC to avoid day shifts
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return { year: y, month: m - 1, day: d };
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    }

    function eventDateKey(value) {
      const p = parseEventDate(value);
      return p ? `${p.year}-${p.month}-${p.day}` : "invalid";
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
      const yearEvents = events.filter((event) => {
        const p = parseEventDate(event.date);
        return p && p.year === selectedYear;
      });
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
        const p = parseEventDate(event.date);
        return p && p.year === selectedYear && p.month === selectedMonth;
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

  initRevealObserver();
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

  const lead = initiative.lead;
  document.getElementById("initiativeLeadBlock").innerHTML = `
    <article class="initiative-person">
      <p class="text-xs text-muted">Initiative Lead</p>
      <h3 class="mt-1 text-lg font-semibold">${lead.name}</h3>
      <p class="text-sm text-muted">${lead.role} · ${lead.class}</p>
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

const feedMessages = [];

async function renderActivityFeed() {
  const el = document.getElementById("activityFeed");
  if (!el) return;
  el.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let messages = [...feedMessages];

  try {
    const res = await fetch(`${API_BASE}/system/activity`);
    const data = await res.json();
    if (data.activity && Array.isArray(data.activity)) {
      messages = [...messages, ...data.activity];
    }

    // Include scheduled initiatives from all councils
    allCouncils.forEach(council => {
      (council.calendarEvents || []).forEach(ev => {
        messages.push({
          date: ev.date,
          tag: "event",
          label: "initiative",
          msg: `${council.name} · ${ev.title}`,
          councilColor: council.color,
          councilSlug: toSlug(council.name),
          initiativeId: ev.initiativeId || ev.id
        });
      });
    });
  } catch (err) {
    console.warn("Activity fetch failed, using fallback:", err);
  }

  // Sorting Logic:
  // 1. Upcoming events (>= today) come FIRST, ordered by proximity (ascending)
  // 2. Past events (< today) come AFTER, ordered by recency (descending)
  const sortedMessages = [...messages]
    .filter(m => !isNaN(new Date(m.date).getTime())) // Filter out invalid dates
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const isUpcomingA = dateA >= today;
      const isUpcomingB = dateB >= today;

      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;
      if (isUpcomingA && isUpcomingB) return dateA - dateB;
      return dateB - dateA;
    });

  const icons = {
    info: "◈",
    vote: "⚖",
    ok: "✔",
    event: "★"
  };

  const colors = {
    info: "text-blue-400 bg-blue-400/10",
    vote: "text-purple-400 bg-purple-400/10",
    ok: "text-green-400 bg-green-400/10",
    event: "text-amber-400 bg-amber-400/10"
  };

  sortedMessages.forEach((m, i) => {
    const dateObj = new Date(m.date);
    const isUpcoming = dateObj >= today;
    const item = document.createElement("a");
    
    // Determine the target URL — ALL initiative-related feed items should go to initiative.html
    const councilSlug = m.councilSlug || (m.msg.includes(' · ') ? toSlug(m.msg.split(' · ')[0]) : "");
    const initId = m.initiativeId || "";
    let targetUrl = councilSlug ? `council.html?council=${councilSlug}` : "#";

    const isInitiative = ["initiative", "approved", "pending", "rejected"].includes(m.label);
    if (isInitiative) {
      targetUrl = `initiative.html?council=${councilSlug}${initId ? `&initiative=${initId}` : ''}`;
    }

    item.href = targetUrl;
    
    const upcomingClass = isUpcoming ? "border-amber-400/20 bg-amber-400/5 ring-1 ring-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.05)]" : "border-white/5 bg-white/5";
    
    item.className = `flex items-center gap-4 p-3 rounded-xl border ${upcomingClass} transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] block reveal`;
    item.style.animationDelay = `${i * 0.05}s`;

    const iconColor = m.councilColor ? `style="background: ${m.councilColor}; box-shadow: 0 0 10px ${m.councilColor}44;"` : "";
    const labelColor = isUpcoming ? "text-amber-400" : "text-muted/60";

    const daysDiff = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));
    let timeLabel = formatDate(m.date);
    if (isUpcoming) {
      if (daysDiff === 0) timeLabel = "Today";
      else if (daysDiff === 1) timeLabel = "Tomorrow";
      else timeLabel = `In ${daysDiff} Days`;
    }

    item.innerHTML = `
      <div class="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-lg ${m.councilColor ? 'text-white' : (colors[m.tag] || 'text-white/40 bg-white/5')}" ${iconColor}>
        ${m.councilColor ? '★' : (icons[m.tag] || '•')}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] ${labelColor}">${m.label}</p>
          <p class="text-[9px] font-bold ${isUpcoming ? 'text-amber-400/60' : 'text-muted/30'} uppercase">${timeLabel}</p>
        </div>
        <p class="text-sm font-semibold truncate ${isUpcoming ? 'text-white' : 'text-white/80'}">${m.msg}</p>
      </div>
    `;

    el.appendChild(item);
  });

  // Re-initialize the reveal observer to detect the newly added items
  if (typeof initRevealObserver === 'function') {
    setTimeout(initRevealObserver, 50);
  }
}

function showActivityDetail(data) {
  const dialog = document.getElementById("activityDialog");
  if (!dialog) return;

  document.getElementById("activityTitle").textContent = data.msg.split(' · ')[1] || data.msg;
  document.getElementById("activityLabel").textContent = data.label;
  document.getElementById("activityNote").textContent = data.note || `Strategic initiative managed by ${data.msg.split(' · ')[0] || 'Council'}. Current progress is being tracked against institutional KPIs.`;
  document.getElementById("activityDate").textContent = formatDate(data.date);
  
  const iconEl = document.getElementById("activityIcon");
  if (iconEl) {
    iconEl.style.background = data.councilColor || "var(--accent)";
    iconEl.style.color = "#fff";
  }

  const linkEl = document.getElementById("activityLink");
  if (linkEl) {
    const councilName = data.msg.split(' · ')[0];
    const slug = toSlug(councilName);
    linkEl.href = `council.html?council=${slug}`;
  }

  dialog.showModal();
}
async function initGlobalCalendarPage() {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("calendarMonth");
  const upcomingList = document.getElementById("upcomingList");
  if (!calendarGrid) return;

  const today = new Date();
  let current = { year: today.getFullYear(), month: today.getMonth() };
  let activeFilter = "all";

  function getAllEvents() {
    const events = [];
    allCouncils.forEach(c => {
      (c.calendarEvents || []).forEach(ev => {
        events.push({ ...ev, councilName: c.name, councilColor: c.color || "var(--accent)", councilId: c.id });
      });
    });
    return events;
  }

  function buildFilters() {
    const container = document.getElementById("councilFilters");
    const legend = document.getElementById("councilLegend");
    if (!container) return;
    
    const allChip = container.querySelector('[data-filter="all"]');
    container.innerHTML = "";
    if (allChip) container.appendChild(allChip);
    
    if (legend) legend.innerHTML = "";

    allCouncils.forEach(c => {
      const chip = document.createElement("button");
      chip.className = "filter-chip";
      chip.dataset.filter = c.id;
      chip.innerHTML = `<span class="chip-dot" style="background:${c.color}"></span>${c.name.split(" ")[0]}`;
      chip.onclick = () => { activeFilter = c.id; updateActiveChip(); render(); };
      container.appendChild(chip);

      if (legend) {
        const leg = document.createElement("div");
        leg.className = "legend-item";
        leg.innerHTML = `<span class="legend-dot" style="background:${c.color}"></span><span class="legend-text">${c.name}</span>`;
        legend.appendChild(leg);
      }
    });
  }

  function updateActiveChip() {
    document.querySelectorAll(".filter-chip").forEach(ch => {
      ch.classList.toggle("active", ch.dataset.filter === activeFilter);
    });
  }

  function render() {
    calendarGrid.innerHTML = "";
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
    const firstDay = new Date(current.year, current.month, 1).getDay();
    monthTitle.textContent = new Date(current.year, current.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const allEvents = getAllEvents();
    const filtered = activeFilter === "all" ? allEvents : allEvents.filter(e => e.councilId === activeFilter);
    const monthEvents = filtered.filter(ev => {
      const d = new Date(ev.date);
      return d.getFullYear() === current.year && d.getMonth() === current.month;
    });

    const countEl = document.getElementById("calendarEventCount");
    if (countEl) countEl.textContent = `${monthEvents.length} initiative${monthEvents.length !== 1 ? "s" : ""} this month`;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-cell empty";
      calendarGrid.appendChild(empty);
    }

    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${current.year}-${String(current.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = monthEvents.filter(ev => ev.date === dayStr);
      const isToday = dayStr === todayStr;

      const cell = document.createElement("div");
      cell.className = `cal-cell${isToday ? " today" : ""}`;

      const num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = day;
      cell.appendChild(num);

      dayEvents.slice(0, 3).forEach(ev => {
        const pill = document.createElement("div");
        pill.className = "cal-event-pill";
        pill.style.background = ev.councilColor;
        pill.title = `${ev.councilName}: ${ev.title}`;
        pill.innerHTML = `<span class="cal-event-dot"></span><span>${ev.title}</span>`;
        cell.appendChild(pill);
      });
      if (dayEvents.length > 3) {
        const more = document.createElement("span");
        more.className = "cal-more-tag";
        more.textContent = `+${dayEvents.length - 3} more`;
        cell.appendChild(more);
      }

      calendarGrid.appendChild(cell);
    }

    // Sidebar
    upcomingList.innerHTML = "";
    const noUpcoming = document.getElementById("noUpcoming");
    const upcoming = filtered
      .filter(ev => new Date(ev.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    if (upcoming.length === 0) {
      if (noUpcoming) noUpcoming.style.display = "block";
    } else {
      if (noUpcoming) noUpcoming.style.display = "none";
      upcoming.forEach(ev => {
        const d = new Date(ev.date);
        const card = document.createElement("div");
        card.className = "upcoming-card";
        card.innerHTML = `
          <div class="date-badge">
            <span class="mon">${d.toLocaleDateString("en-US",{month:"short"})}</span>
            <span class="day">${d.getDate()}</span>
          </div>
          <div class="upcoming-info">
            <div class="upcoming-council">
              <span class="legend-dot" style="background:${ev.councilColor}"></span>
              <span class="cal-title-tag" style="margin-bottom:0; font-size: 0.55rem;">${ev.councilName}</span>
            </div>
            <p class="upcoming-title">${ev.title}</p>
            <p class="upcoming-date">${formatDate(ev.date)}</p>
          </div>`;
        upcomingList.appendChild(card);
      });
    }

    // Month summary sidebar
    const summaryEl = document.getElementById("monthSummary");
    if (summaryEl) {
      summaryEl.innerHTML = "";
      const councilNames = [...new Set(monthEvents.map(e => e.councilName))];
      if (monthEvents.length === 0) {
        summaryEl.innerHTML = `<p class="text-xs text-muted italic text-center py-4">No initiatives this month.</p>`;
      } else {
        councilNames.forEach(name => {
          const evs = monthEvents.filter(e => e.councilName === name);
          const color = evs[0].councilColor;
          const row = document.createElement("div");
          row.className = "summary-row";
          row.innerHTML = `
            <div class="summary-council">
              <span class="legend-dot" style="background:${color}"></span>
              <span class="legend-text" style="color: var(--cal-text);">${name}</span>
            </div>
            <span class="summary-count">${evs.length}</span>`;
          summaryEl.appendChild(row);
        });
      }
    }
  }

  // Wire controls
  document.getElementById("prevMonth").onclick = () => {
    current.month--;
    if (current.month < 0) { current.month = 11; current.year--; }
    render();
  };
  document.getElementById("nextMonth").onclick = () => {
    current.month++;
    if (current.month > 11) { current.month = 0; current.year++; }
    render();
  };
  const todayBtn = document.getElementById("todayBtn");
  if (todayBtn) todayBtn.onclick = () => {
    current = { year: today.getFullYear(), month: today.getMonth() };
    render();
  };
  
  const allChip = document.querySelector('[data-filter="all"]');
  if (allChip) allChip.onclick = () => { activeFilter = "all"; updateActiveChip(); render(); };

  const liveStatusText = document.getElementById("liveStatusText");
  if (liveStatusText) liveStatusText.textContent = councilData.liveStatus.message;

  buildFilters();
  render();
}

async function renderGlobalCalendar() {
  const calendarGrid = document.getElementById("globalCalendarGrid");
  if (!calendarGrid) return;
  calendarGrid.innerHTML = "";

  const allEvents = [];
  allCouncils.forEach(council => {
    (council.calendarEvents || []).forEach(ev => {
      allEvents.push({
        ...ev,
        councilName: council.name,
        councilColor: council.color,
        councilSlug: toSlug(council.name)
      });
    });
  });

  if (allEvents.length === 0) {
    calendarGrid.innerHTML = `<p class="col-span-full py-12 text-center text-muted italic">No upcoming initiatives scheduled across councils.</p>`;
    return;
  }

  // Sort by date
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  allEvents.forEach((ev, i) => {
    const item = document.createElement("a");
    item.href = `council.html?council=${ev.councilSlug}`;
    item.className = "group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 reveal";
    item.style.animationDelay = `${i * 0.05}s`;

    const d = new Date(ev.date);
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });

    item.innerHTML = `
      <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
        <span class="text-[10px] font-black uppercase tracking-widest text-muted/60">${month}</span>
        <span class="text-xl font-black text-white">${day}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="h-1.5 w-1.5 rounded-full" style="background: ${ev.councilColor}"></span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-muted/80">${ev.councilName}</span>
        </div>
        <h4 class="truncate text-sm font-bold text-white group-hover:text-accent transition-colors">${ev.title}</h4>
        <p class="truncate text-xs text-muted/60">${ev.note || 'Council Initiative'}</p>
      </div>
      <div class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
        <span class="text-lg">→</span>
      </div>
    `;
    calendarGrid.appendChild(item);
  });
}

const yearEl = document.getElementById("academic-year");

const now = new Date();
const startYear = now.getFullYear();
const endYear = startYear + 1;

if (yearEl) yearEl.textContent = `• Academic Year ${startYear} – ${endYear}`;


async function init() {
  initTheme();
  await enrichCouncilData();
  
  // Page-specific initialization
  if (academicGrid && houseGrid && rankingList) {
    await initDashboardPage();
  } else if (document.getElementById("globalCalendarPage")) {
    initGlobalCalendarPage();
  } else {
    // On secondary pages, we still need basic handlers and animations
    initCouncilDetailPage();
    initInitiativePage();
    bindFeedbackHandlers();
    initRevealObserver();
  }
  
  // renderActivityFeed is already called inside initDashboardPage for the main view
  // and doesn't need to be called globally here to prevent double-clearing.
}

init();

// async function fetchDataFromSource() {
//   const response = await fetch("https://your-google-sheet-or-drive-endpoint");
//   const externalData = await response.json();
//   Object.assign(councilData, externalData);
//   // Re-render UI after replacing councilData with external data.
// }
