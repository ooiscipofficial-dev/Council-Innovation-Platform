const academicGrid = document.getElementById("academicGrid");
const houseGrid = document.getElementById("houseGrid");
const rankingList = document.getElementById("rankingList");
const topCouncilBanner = document.getElementById("topCouncilBanner");
const chartArea = document.getElementById("chartArea");
const feedbackDialog = document.getElementById("feedbackDialog");
const feedbackTitle = document.getElementById("feedbackTitle");
const councilInput = document.getElementById("councilInput");
let activeChartType = "pie";

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
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold md:text-lg ${isHouse ? "house-name" : ""}">${council.name}</h3>
        <p class="mt-1 text-xs text-muted">Main Project: ${council.mainProject.title}</p>
      </div>
      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" style="background: color-mix(in srgb, ${statusColor} 18%, transparent); color: ${statusColor}; border: 1px solid color-mix(in srgb, ${statusColor} 35%, var(--border));">
        ${council.mainProject.status}
      </span>
    </div>

    <div class="mt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Initiative Tracker</p>
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
        <div class="progress-fill ${statusClass(council.mainProject.status)} h-full rounded-full" style="width: ${council.mainProject.progress}%"></div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-2">
      <p class="rounded-md border border-theme px-2.5 py-1 text-xs surface-input">
        Achievement: ${council.achievement}
      </p>
    </div>

    <div class="mt-4 flex items-center justify-between gap-2">
      <span class="text-xs text-muted">Impact Score: <strong class="text-theme">${council.impactScore}</strong></span>
      <button class="feedback-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-white btn-accent" data-council="${council.name}">
        Give Feedback
      </button>
    </div>
  `;

  const openLink = () => { window.location.href = council.homepage; };
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
  const totalCouncils = allCouncils.length;
  const completed = allCouncils.filter((c) => c.mainProject.status === "Completed").length;
  const avgProgress = Math.round(allCouncils.reduce((sum, c) => sum + c.mainProject.progress, 0) / totalCouncils);
  const best = [...allCouncils].sort((a, b) => b.impactScore - a.impactScore)[0];

  const stats = [
    { label: "Total Councils", value: totalCouncils },
    { label: "Completed Projects", value: completed },
    { label: "Avg. Effort", value: avgProgress, suffix: "%" },
    { label: "Top Council", text: best.name.split(" ")[0] }
  ];

  const heroStats = document.getElementById("heroStats");
  stats.forEach((stat) => {
    const box = document.createElement("div");
    box.className = "rounded-xl border border-theme px-3 py-3";
    box.style.background = "color-mix(in srgb, var(--surface) 66%, transparent)";

    if (stat.text) {
      box.innerHTML = `<p class=\"text-xs text-muted\">${stat.label}</p><p class=\"mt-1 text-lg font-semibold\">${stat.text}</p>`;
    } else {
      box.innerHTML = `<p class=\"text-xs text-muted\">${stat.label}</p><p class=\"mt-1 text-lg font-semibold\"><span class=\"count\">0</span>${stat.suffix || ""}</p>`;
      animateCount(box.querySelector(".count"), stat.value);
    }

    heroStats.appendChild(box);
  });
}

function renderRanking() {
  rankingList.innerHTML = "";
  const ranked = getSortedCouncilData();
  ranked.forEach((council, index) => {
    const item = document.createElement("li");
    item.className = "rounded-xl border border-theme text-sm";
    item.style.background = index === 0
      ? "color-mix(in srgb, var(--accent-soft) 58%, transparent)"
      : "color-mix(in srgb, var(--surface-strong) 70%, transparent)";

    item.innerHTML = `
      <a class="rank-btn block px-3 py-2" href="council.html?council=${encodeURIComponent(toSlug(council.name))}">
        <div class="flex items-center justify-between gap-3">
          <span><strong>${index + 1}.</strong> ${council.name}</span>
          <span class="font-semibold">${council.performance}</span>
        </div>
      </a>
    `;

    rankingList.appendChild(item);
  });

  const best = ranked[0];
  topCouncilBanner.innerHTML = `<strong>${best.name}</strong> is currently leading with a performance score of <strong>${best.performance}</strong>.`;
}

function renderPieChart(data) {
  const size = 270;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;
  const palette = ["#4f7ce6", "#34a46a", "#d78b29", "#cf4f4f", "#8b6ed6", "#2ea6a1", "#7d97b8"];
  const total = data.reduce((sum, item) => sum + item.performance, 0);

  const slices = data.map((item, i) => {
    const ratio = item.performance / total;
    const dash = ratio * circumference;
    const share = (ratio * 100).toFixed(1);
    const slice = `
      <circle
        class="pie-slice"
        data-name="${item.name}"
        data-performance="${item.performance}"
        data-share="${share}"
        cx="${size / 2}"
        cy="${size / 2}"
        r="${radius}"
        fill="none"
        stroke="${palette[i % palette.length]}"
        stroke-width="${stroke}"
        stroke-dasharray="${dash} ${circumference - dash}"
        stroke-dashoffset="${-currentOffset}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
      />`;
    currentOffset += dash;
    return slice;
  }).join("");

  const legend = data.slice(0, 7)
    .map((item, i) => `<li class=\"flex items-center justify-between text-xs\"><span class=\"flex items-center gap-2\"><span class=\"h-2.5 w-2.5 rounded-full\" style=\"background:${palette[i % palette.length]}\"></span>${item.name}</span><strong>${item.performance}</strong></li>`)
    .join("");

  chartArea.innerHTML = `
    <div class="grid gap-4 md:grid-cols-[290px_1fr] md:items-center">
      <div class="mx-auto">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Council performance pie chart">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--border)" stroke-width="${stroke}" />
          ${slices}
        </svg>
      </div>
      <ul class="space-y-2">${legend}</ul>
    </div>
    <div id="chartTooltip" class="chart-tooltip"></div>
  `;

  initPieChartHover();
}

function renderBarChart(data) {
  const max = Math.max(...data.map((item) => item.performance));
  const palette = ["#4f7ce6", "#34a46a", "#d78b29", "#cf4f4f", "#8b6ed6", "#2ea6a1", "#7d97b8", "#ef6f9f"];
  const bars = data.slice(0, 8)
    .map((item, index) => {
      const height = Math.max(8, Math.round((item.performance / max) * 100));
      const barColor = palette[index % palette.length];
      return `
        <div class="flex flex-col items-center gap-2">
          <div class="relative flex h-48 w-10 items-end rounded-md" style="background: color-mix(in srgb, var(--surface-strong) 76%, transparent);">
            <div class="chart-bar bar-segment w-full rounded-md" data-name="${item.name}" data-performance="${item.performance}" data-progress="${item.mainProject.progress}" data-impact="${item.impactScore}" style="height: ${height}%; --delay: ${index * 0.08}s; background: linear-gradient(180deg, color-mix(in srgb, ${barColor} 78%, white), ${barColor});"></div>
            <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold">${item.performance}</span>
          </div>
          <span class="text-center text-[11px] text-muted">${item.name.split(" ")[0]}</span>
        </div>
      `;
    }).join("");

  chartArea.innerHTML = `<div class="flex items-end justify-between gap-2 overflow-x-auto pb-2">${bars}</div><div id="chartTooltip" class="chart-tooltip"></div>`;
  initBarChartHover();
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

function initPieChartHover() {
  chartArea.querySelectorAll(".pie-slice").forEach((slice) => {
    slice.addEventListener("mousemove", (event) => {
      showChartTooltip(event, `<p class=\"font-semibold\">${slice.dataset.name}</p><p class=\"text-muted\">Performance: <strong class=\"text-theme\">${slice.dataset.performance}</strong></p><p class=\"text-muted\">Share: <strong class=\"text-theme\">${slice.dataset.share}%</strong></p>`);
    });
    slice.addEventListener("mouseleave", hideChartTooltip);
  });
}

function initBarChartHover() {
  chartArea.querySelectorAll(".bar-segment").forEach((bar) => {
    bar.addEventListener("mousemove", (event) => {
      showChartTooltip(event, `<p class=\"font-semibold\">${bar.dataset.name}</p><p class=\"text-muted\">Performance: <strong class=\"text-theme\">${bar.dataset.performance}</strong></p><p class=\"text-muted\">Effort: <strong class=\"text-theme\">${bar.dataset.progress}%</strong></p><p class=\"text-muted\">Impact: <strong class=\"text-theme\">${bar.dataset.impact}</strong></p>`);
    });
    bar.addEventListener("mouseleave", hideChartTooltip);
  });
}

function setChart(type = "pie") {
  activeChartType = type;
  const sorted = getSortedCouncilData();
  if (type === "bar") renderBarChart(sorted);
  else renderPieChart(sorted);

  document.querySelectorAll(".chart-toggle").forEach((btn) => {
    const active = btn.dataset.chart === type;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    btn.style.background = active ? "var(--accent)" : "var(--surface-strong)";
    btn.style.color = active ? (isDark ? "#0a0a0a" : "#ffffff") : "var(--text)";
  });
}

function bindFeedbackHandlers() {
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest(".feedback-btn");
    if (!button) return;
    event.stopPropagation();
    councilInput.value = button.dataset.council;
    feedbackTitle.textContent = `Feedback for ${button.dataset.council}`;
    feedbackDialog.showModal();
  });

  document.getElementById("cancelFeedback").addEventListener("click", () => feedbackDialog.close());
  document.getElementById("feedbackForm").addEventListener("submit", (event) => {
    event.preventDefault();
    alert(`Thanks. Feedback submitted for ${councilInput.value}.`);
    event.target.reset();
    feedbackDialog.close();
  });
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

function initDashboardPage() {
  document.getElementById("liveStatusText").textContent = `Live Status: ${councilData.liveStatus.message}`;
  renderCouncils();
  renderHeroStats();
  renderRanking();
  setChart("pie");
  bindFeedbackHandlers();
  initRevealObserver();
  initHeroAnimation();

  document.querySelectorAll(".chart-toggle").forEach((btn) => {
    btn.addEventListener("click", () => setChart(btn.dataset.chart));
  });
}

document.addEventListener("themechange", () => {
  if (chartArea) setChart(activeChartType);
});
const feedMessages = [
  { date: "2026-04-17", tag: "info", label: "update", msg: "Cultural · Symphonia lineup phase 1 locked" },
  { date: "2026-04-17", tag: "info", label: "update", msg: "Innovation · School App v2 pushed to 65%" },
  { date: "2026-04-16", tag: "vote", label: "vote",   msg: "Discipline · Honor Code revision open for feedback" },
  { date: "2026-04-15", tag: "ok",   label: "win",    msg: "Environment Council · 'Green School' certification approved" },
  { date: "2026-04-14", tag: "ok",   label: "win",    msg: "Aries · clinched Sports Trophy, avg 91% progress" },
  { date: "2026-04-12", tag: "event",label: "event",  msg: "Literary MUN registrations opened · 312 signups" },
  { date: "2026-04-17", tag: "info", label: "update", msg: "Cultural · Symphonia lineup phase 1 locked" },
  { date: "2026-04-17", tag: "info", label: "update", msg: "Innovation · School App v2 pushed to 65%" },
  { date: "2026-04-16", tag: "vote", label: "vote",   msg: "Discipline · Honor Code revision open for feedback" },
  { date: "2026-04-15", tag: "ok",   label: "win",    msg: "Environment Council · 'Green School' certification approved" },
  { date: "2026-04-14", tag: "ok",   label: "win",    msg: "Aries · clinched Sports Trophy, avg 91% progress" },
  { date: "2026-04-12", tag: "event",label: "event",  msg: "Literary MUN registrations opened · 312 signups" },
];

async function seedConsoleFeed() {
  const el = document.getElementById("consoleFeed");
  if (!el) return;
  el.innerHTML = ""; 

  // Sort: Newest at bottom for log-style typing
  const sortedMessages = [...feedMessages].sort((a, b) => new Date(a.date) - new Date(b.date));
  // The character-by-character typist
  const typeInto = async (parent, text, speed) => {
    // Create cursor
    const cursor = document.createElement("span");
    cursor.className = "terminal-cursor";
    cursor.textContent = "_";
    parent.appendChild(cursor);

    for (let char of text) {
      // Insert character BEFORE the cursor
      cursor.insertAdjacentText('beforebegin', char);
      
      // Auto-scroll the feed to follow the cursor
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        });
      
      await new Promise(r => setTimeout(r, speed));
    }
    // Remove cursor from finished line so it doesn't blink everywhere
    cursor.remove();
  };

  for (const m of sortedMessages) {
    const line = document.createElement("div");
    line.className = "feed-line";
    
    // Create containers for date and tag to pop in instantly
    line.innerHTML = `<span class="time">[${m.date}]</span><span class="tag ${m.tag}">${m.label}</span><span class="msg-content"></span>`;
    el.appendChild(line);

    const msgContainer = line.querySelector(".msg-content");

    // Type the message with the cursor leading the way
    await typeInto(msgContainer, ` ${m.msg}`, 0.1);
    
    // Brief pause before the next log entry
    await new Promise(r => setTimeout(r, 25));
  }

  // Add a final permanent blinking cursor at the bottom of the feed
  const finalPrompt = document.createElement("div");
  finalPrompt.className = "feed-line final-prompt";
  finalPrompt.innerHTML = `<span class="terminal-cursor">_</span>`;
  
  el.appendChild(finalPrompt);
  requestAnimationFrame(() => {
  el.scrollTop = el.scrollHeight;
});
}
const yearEl = document.getElementById("academic-year");

const now = new Date();
const startYear = now.getFullYear();
const endYear = startYear + 1;

yearEl.textContent = `Academic Year ${startYear} – ${endYear}`;


function init() {
  initTheme();
  if (academicGrid && houseGrid && rankingList && chartArea) initDashboardPage();
  initCouncilDetailPage();
  initInitiativePage();
  seedConsoleFeed()
}

init();

// async function fetchDataFromSource() {
//   const response = await fetch("https://your-google-sheet-or-drive-endpoint");
//   const externalData = await response.json();
//   Object.assign(councilData, externalData);
//   // Re-render UI after replacing councilData with external data.
// }
initTheme();
initDashboardPage();