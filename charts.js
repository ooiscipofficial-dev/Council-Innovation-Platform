// =========================
// STATE
// =========================
let chartInstance = null;
let currentView = "bar";
let currentData = [];

// =========================
// PALETTE
// =========================
const PALETTE = [
  { from: "#667eea", to: "#764ba2" },
  { from: "#f093fb", to: "#f5576c" },
  { from: "#4facfe", to: "#00f2fe" },
  { from: "#43e97b", to: "#38f9d7" },
  { from: "#fa709a", to: "#fee140" },
  { from: "#a78bfa", to: "#818cf8" },
  { from: "#fb923c", to: "#f97316" },
  { from: "#34d399", to: "#059669" },
  { from: "#f472b6", to: "#ec4899" },
  { from: "#facc15", to: "#eab308" },
];

const COLORS = PALETTE.map((p) => p.from);

// =========================
// THEME DETECTION
// =========================
function isDarkMode() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

function getThemeColors() {
  const dark = isDarkMode();
  return {
    // surfaces
    bg: dark ? "#0a0a0a" : "#fafafa",
    bgSubtle: dark ? "#0f0f0f" : "#f4f4f4",
    bgElevated: dark ? "#111" : "#f0f0f0",

    // text
    textPrimary: dark ? "#ededed" : "#111",
    textSecondary: dark ? "#888" : "#333",
    textTertiary: dark ? "#666" : "#999",
    textMuted: dark ? "#555" : "#999",
    textGhost: dark ? "#444" : "#aaa",

    // grid / axis
    gridLine: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
    axisLabel: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)",
    axisLabelFaint: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)",
    radarLabel: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.55)",

    // tooltip
    tooltipBg: dark ? "rgba(8,8,16,0.96)" : "rgba(255,255,255,0.97)",
    tooltipBorder: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    tooltipTitle: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)",
    tooltipValue: dark ? "#fff" : "#111",
    tooltipUnit: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
    tooltipShadow: dark
      ? "0 12px 40px rgba(0,0,0,0.6)"
      : "0 12px 40px rgba(0,0,0,0.12)",

    // chart specifics
    markerStroke: dark ? "#080810" : "#fafafa",
    dataLabelColor: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)",
    legendLabel: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)",
    donutNameColor: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)",
    donutValueColor: dark ? "#fff" : "#111",
    donutTotalColor: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)",

    // radar polygons
    radarStroke: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
    radarConnector: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
    radarFill1: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    radarFill2: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",

    // gradient shades
    gradientShade: dark ? "dark" : "light",
  };
}

// =========================
// RENDER
// =========================
function renderBarChart(data) {
  if (!data || data.length === 0) return;
  currentData = data;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const chartArea = document.getElementById("chartArea");
  if (chartArea) {
    chartArea.innerHTML = buildChartShell(data);
    injectStyles();
    mountChart("apexChartMain", data, currentView, false);
    bindViewButtons();
  }
}

// =========================
// SHELL HTML
// =========================
function buildChartShell(data) {
  const views = ["bar", "area", "radar", "donut"];
  const stats = computeStats(data);

  return `
    <div class="chart-root">

      <!-- Ambient -->
      <div class="chart-ambient">
        <div class="ambient-blob blob-1"></div>
        <div class="ambient-blob blob-2"></div>
        <div class="ambient-blob blob-3"></div>
      </div>

      <!-- Header -->
      <div class="chart-header">
        <div class="chart-title-block">
          <div class="chart-live-badge">
            <span class="live-dot"></span>
            Live Analytics
          </div>
        </div>

        <div class="chart-controls">
          <div class="view-switcher">
            ${views
              .map(
                (v) => `
              <button
                class="vbtn ${v === currentView ? "vbtn--active" : ""}"
                data-view="${v}"
              >
                <span class="vbtn-icon">${getViewIcon(v)}</span>
                <span class="vbtn-label">${v}</span>
              </button>
            `
              )
              .join("")}
          </div>

          <button class="focus-btn" onclick="openChartModal()">
            <span>⛶</span>
            <span class="focus-btn-label">Focus</span>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        ${stats
          .map(
            (s) => `
          <div class="stat-card">
            <div class="stat-icon" style="color:${s.color}; text-shadow: 0 0 8px ${s.color}88;">${s.icon}</div>
            <div class="stat-body">
              <div class="stat-label">${s.label}</div>
              <div class="stat-value">${s.value}</div>
            </div>
            <div class="stat-glow" style="background:${s.color}18;"></div>
          </div>
        `
          )
          .join("")}
      </div>

      <!-- Chart scroll area -->
      <div class="chart-scroll-outer">
        <div class="chart-scroll-inner" id="chartScrollInner">
          <div id="apexChartMain" class="apex-host"></div>
        </div>

        <!-- Scroll fade edges -->
        <div class="scroll-fade scroll-fade--left"  id="fadeLeft"></div>
        <div class="scroll-fade scroll-fade--right" id="fadeRight"></div>
      </div>

      <!-- Scroll hint -->
      <div class="scroll-hint" id="scrollHint">
        <span class="scroll-hint-arrow">←</span>
        Scroll to explore
        <span class="scroll-hint-arrow">→</span>
      </div>

    </div>
  `;
}

// =========================
// MOUNT CHART
// =========================
function mountChart(elId, data, type, isModal = false) {
  const el = document.getElementById(elId);
  if (!el) return null;
  el.innerHTML = "";

  const count = data.length;
  const isScrollable = ["bar"].includes(type) && count > 7;

  if (isScrollable && !isModal) {
    const barW = Math.max(
      64,
      Math.min(90, Math.floor(window.innerWidth * 0.08))
    );
    const totalW = Math.max(count * barW + 80, 600);
    el.style.width = totalW + "px";
    el.style.minWidth = totalW + "px";
  } else {
    el.style.width = "100%";
    el.style.minWidth = "0";
  }

  // Radar gets more height
  let height;
  if (isModal) {
    height = "100%";
  } else if (type === "radar") {
    height = 400;
  } else if (isScrollable) {
    height = 320;
  } else {
    height = 300;
  }

  const opts = buildOptions(data, type, height, isScrollable);

  const instance = new ApexCharts(el, opts);
  instance.render();

  if (!isModal) {
    chartInstance = instance;
    chartInstance._type = type;
    chartInstance._data = data;

    if (isScrollable) {
      setupScrollIndicators();
    } else {
      hideScrollHint();
    }
  }

  return instance;
}

// =========================
// CHART OPTIONS
// =========================
function buildOptions(data, type, height, isScrollable = false) {
  const theme = getThemeColors();
  const labels = data.map((d) => d.name.replace(" Council", ""));
  const values = data.map((d) => d.performance ?? d.value ?? 0);
  const count = labels.length;

  const colWidth = isScrollable
    ? `${Math.max(40, Math.min(65, Math.floor(480 / count)))}%`
    : count <= 4
    ? "38%"
    : count <= 7
    ? "52%"
    : "62%";

  const base = {
    series: [{ name: "Performance", data: values }],
    chart: {
      type: type === "donut" ? "donut" : type === "radar" ? "radar" : type,
      height,
      width: "100%",
      background: "transparent",
      toolbar: { show: false },
      foreColor: theme.textMuted,
      fontFamily: "inherit",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 650,
        animateGradually: { enabled: true, delay: 50 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      dropShadow: {
        enabled: type === "area",
        top: 6,
        blur: 10,
        color: "#667eea",
        opacity: 0.2,
      },
    },
    colors: COLORS,
    fill: buildFill(type, theme),
    stroke: buildStroke(type),
    grid: {
      borderColor: theme.gridLine,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: type !== "radar" && type !== "donut" } },
      padding: { top: 4, right: 12, bottom: 4, left: 12 },
    },
    tooltip: {
      theme: false,
      custom: buildTooltip(labels, theme),
    },
    legend: {
      show: type === "donut" || type === "radar",
      position: "bottom",
      horizontalAlign: "center",
      labels: { colors: theme.legendLabel },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 8, vertical: 4 },
      fontSize: "11px",
    },
    xaxis: {
      categories: labels,
      labels: {
        rotate: count > 6 ? -35 : 0,
        rotateAlways: count > 6,
        trim: !isScrollable,
        maxHeight: count > 6 ? 70 : 40,
        style: {
          colors: labels.map(() => theme.axisLabel),
          fontSize: "11px",
          fontFamily: "inherit",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        style: {
          colors: [theme.axisLabelFaint],
          fontSize: "11px",
          fontFamily: "inherit",
        },
        formatter: (v) => `${v}%`,
      },
    },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            height:
              type === "radar"
                ? 340
                : isScrollable
                ? 280
                : 240,
          },
          xaxis: {
            labels: {
              rotate: -45,
              rotateAlways: true,
              style: { fontSize: "10px" },
            },
          },
          yaxis: { labels: { style: { fontSize: "10px" } } },
          dataLabels: { enabled: false },
        },
      },
    ],
  };

  // --- BAR ---
  if (type === "bar") {
    base.plotOptions = {
      bar: {
        borderRadius: 7,
        borderRadiusApplication: "end",
        columnWidth: colWidth,
        distributed: true,
        dataLabels: { position: "top" },
      },
    };
    base.dataLabels = {
      enabled: true,
      formatter: (v) => `${v}%`,
      offsetY: -22,
      style: {
        fontSize: "10px",
        fontWeight: "600",
        fontFamily: "inherit",
        colors: [theme.dataLabelColor],
      },
      background: { enabled: false },
    };
    base.legend.show = false;
  }

  // --- AREA ---
  if (type === "area") {
    base.series = [{ name: "Performance", data: values }];
    base.colors = ["#4facfe"];
    base.stroke = { curve: "smooth", width: 2.5, colors: ["#4facfe"] };
    base.markers = {
      size: 4,
      colors: ["#4facfe"],
      strokeColors: theme.markerStroke,
      strokeWidth: 2,
      hover: { size: 6 },
    };
    base.fill = {
      type: "gradient",
      gradient: {
        shade: theme.gradientShade,
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: ["#00f2fe"],
        opacityFrom: 0.5,
        opacityTo: 0.02,
        stops: [0, 90],
      },
    };
  }

  // --- RADAR ---
  if (type === "radar") {
    base.colors = ["#667eea"];
    base.fill = {
      type: "gradient",
      gradient: {
        shade: theme.gradientShade,
        type: "radial",
        shadeIntensity: 0.4,
        opacityFrom: 0.55,
        opacityTo: 0.1,
      },
    };
    base.stroke = { width: 2, colors: ["#667eea"] };
    base.markers = {
      size: 4,
      colors: ["#667eea"],
      strokeColors: theme.markerStroke,
      strokeWidth: 2,
    };
    base.plotOptions = {
      radar: {
        size: undefined,
        offsetX: 0,
        offsetY: 0,
        polygons: {
          strokeColors: theme.radarStroke,
          strokeWidth: 1,
          connectorColors: theme.radarConnector,
          fill: {
            colors: [theme.radarFill1, theme.radarFill2],
          },
        },
      },
    };
    base.xaxis = {
      categories: labels,
      labels: {
        style: {
          colors: labels.map(() => theme.radarLabel),
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: "500",
        },
      },
    };
    base.yaxis = {
      show: false,
      min: 0,
      max: 100,
      tickAmount: 5,
    };
    base.legend.show = false;
    base.dataLabels.enabled = false;
    base.chart.height = height === "100%" ? "100%" : Math.max(height, 400);
  }

  // --- DONUT ---
  if (type === "donut") {
    base.series = values;
    base.labels = labels;
    base.colors = COLORS;
    base.fill = {
      type: "gradient",
      gradient: {
        shade: theme.gradientShade,
        type: "horizontal",
        shadeIntensity: 0.4,
        gradientToColors: PALETTE.map((p) => p.to),
        opacityFrom: 1,
        opacityTo: 1,
      },
    };
    base.plotOptions = {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "11px",
              fontFamily: "inherit",
              color: theme.donutNameColor,
              offsetY: -6,
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: "700",
              fontFamily: "inherit",
              color: theme.donutValueColor,
              offsetY: 4,
              formatter: (v) => `${Math.round(v)}%`,
            },
            total: {
              show: true,
              label: "Average",
              color: theme.donutTotalColor,
              fontSize: "11px",
              fontFamily: "inherit",
              formatter: (w) => {
                const s = w.globals.seriesTotals;
                return `${Math.round(
                  s.reduce((a, b) => a + b, 0) / s.length
                )}%`;
              },
            },
          },
        },
      },
    };
    base.stroke = { show: false, width: 0 };
    base.dataLabels = { enabled: false };
    base.legend = {
      show: true,
      position: "bottom",
      labels: { colors: theme.legendLabel },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 6, vertical: 3 },
      fontSize: "11px",
      fontFamily: "inherit",
    };
    delete base.xaxis;
    delete base.yaxis;
    base.tooltip = {
      theme: false,
      custom: ({ series, seriesIndex, w }) => {
        const val = series[seriesIndex];
        const name = w.globals.labels[seriesIndex];
        const color = COLORS[seriesIndex % COLORS.length];
        return tooltipHTML(name, val, color, theme);
      },
    };
  }

  return base;
}

// =========================
// FILL / STROKE
// =========================
function buildFill(type, theme) {
  if (type === "bar") {
    return {
      type: "gradient",
      gradient: {
        shade: theme.gradientShade,
        type: "vertical",
        shadeIntensity: 0.35,
        gradientToColors: PALETTE.map((p) => p.to),
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.75,
        stops: [0, 100],
      },
    };
  }
  return { type: "solid", opacity: 1 };
}

function buildStroke(type) {
  if (type === "bar" || type === "donut") return { show: false };
  return { curve: "smooth", width: 2.5 };
}

// =========================
// TOOLTIP
// =========================
function buildTooltip(labels, theme) {
  return ({ series, seriesIndex, dataPointIndex, w }) => {
    const val = series[seriesIndex][dataPointIndex];
    const name =
      w.globals.labels?.[dataPointIndex] ?? labels[dataPointIndex] ?? "";
    const color = COLORS[dataPointIndex % COLORS.length];
    return tooltipHTML(name, val, color, theme);
  };
}

function tooltipHTML(name, val, color, theme) {
  if (!theme) theme = getThemeColors();
  return `
    <div style="
      background: ${theme.tooltipBg};
      border: 1px solid ${theme.tooltipBorder};
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: ${theme.tooltipShadow}, 0 0 0 1px ${color}22;
      font-family: inherit;
      min-width: 130px;
    ">
      <div style="
        font-size: 9px; text-transform: uppercase;
        letter-spacing: 0.14em; color: ${theme.tooltipTitle};
        margin-bottom: 8px;
      ">${name}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="
          width:9px; height:9px; border-radius:50%;
          background:${color};
          box-shadow: 0 0 8px ${color};
          flex-shrink:0;
        "></div>
        <span style="font-size:22px; font-weight:700; color:${theme.tooltipValue}; line-height:1;">
          ${val}<span style="font-size:12px; color:${theme.tooltipUnit}; margin-left:2px;">%</span>
        </span>
      </div>
    </div>
  `;
}

// =========================
// SCROLL INDICATORS
// =========================
function setupScrollIndicators() {
  const outer = document.querySelector(".chart-scroll-outer");
  const inner = document.getElementById("chartScrollInner");
  const fadeL = document.getElementById("fadeLeft");
  const fadeR = document.getElementById("fadeRight");
  const hint = document.getElementById("scrollHint");

  if (!outer || !inner) return;

  function update() {
    const sl = inner.scrollLeft;
    const max = inner.scrollWidth - inner.clientWidth;
    if (fadeL) fadeL.style.opacity = sl > 8 ? "1" : "0";
    if (fadeR) fadeR.style.opacity = sl < max - 8 ? "1" : "0";
    if (hint) hint.style.opacity = sl > 20 ? "0" : "1";
  }

  inner.addEventListener("scroll", update, { passive: true });
  requestAnimationFrame(update);
}

function hideScrollHint() {
  const hint = document.getElementById("scrollHint");
  if (hint) hint.style.display = "none";
  const fadeL = document.getElementById("fadeLeft");
  const fadeR = document.getElementById("fadeRight");
  if (fadeL) fadeL.style.display = "none";
  if (fadeR) fadeR.style.display = "none";
}

// =========================
// VIEW BUTTONS
// =========================
function bindViewButtons() {
  document.querySelectorAll(".vbtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;
      if (v) switchChartView(v);
    });
  });
}

function switchChartView(type) {
  currentView = type;

  document.querySelectorAll(".vbtn[data-view]").forEach((b) => {
    b.classList.toggle("vbtn--active", b.dataset.view === type);
  });

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  mountChart("apexChartMain", currentData, type, false);
}

// =========================
// STATS
// =========================
function computeStats(data) {
  const vals = data.map((d) => d.performance ?? d.value ?? 0);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const topD = data[vals.indexOf(maxV)];
  const botD = data[vals.indexOf(minV)];

  return [
    {
      label: "Average",
      value: `${avg}%`,
      color: "#818cf8",
      icon: "◈",
    },
    {
      label: "Top Council",
      value: (topD?.name || "—").replace(" Council", ""),
      color: "#34d399",
      icon: "▲",
    },
    {
      label: "Peak Score",
      value: `${maxV}%`,
      color: "#a78bfa",
      icon: "⬆",
    },
    {
      label: "Lowest",
      value: `${minV}%`,
      color: "#f472b6",
      icon: "⬇",
    },
  ];
}

// =========================
// ICONS
// =========================
function getViewIcon(v) {
  return (
    { bar: "▦", area: "⌇", radar: "◎", donut: "◉" }[v] || ""
  );
}

// =========================
// MODAL
// =========================
function ensureModal() {
  if (document.getElementById("chartModal")) return;

  const views = ["bar", "area", "radar", "donut"];

  const modal = document.createElement("div");
  modal.id = "chartModal";
  modal.className = "chart-modal-overlay";

  modal.innerHTML = `
    <div class="chart-modal-box">

      <div class="chart-ambient" style="border-radius:20px; overflow:hidden;">
        <div class="ambient-blob blob-1"></div>
        <div class="ambient-blob blob-2"></div>
      </div>

      <div class="chart-modal-header">
        <div>
          <div class="chart-live-badge">
            <span class="live-dot"></span>
            Focus View
          </div>
          <h2 class="chart-title" style="margin-top:4px;">Performance Insights</h2>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <div class="view-switcher">
            ${views
              .map(
                (v) => `
              <button
                class="vbtn ${v === currentView ? "vbtn--active" : ""}"
                data-modal-view="${v}"
              >
                <span class="vbtn-icon">${getViewIcon(v)}</span>
                <span class="vbtn-label">${v}</span>
              </button>
            `
              )
              .join("")}
          </div>

          <button class="modal-close-btn" onclick="closeChartModal()">✕</button>
        </div>
      </div>

      <div class="chart-modal-body">
        <div class="chart-scroll-outer" style="flex:1; min-height:0;">
          <div class="chart-scroll-inner" id="modalScrollInner">
            <div id="apexChartModal" class="apex-host" style="height:100%;"></div>
          </div>
          <div class="scroll-fade scroll-fade--left"  id="modalFadeLeft"></div>
          <div class="scroll-fade scroll-fade--right" id="modalFadeRight"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeChartModal();
  });

  modal.querySelectorAll("[data-modal-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.modalView;
      modal.querySelectorAll("[data-modal-view]").forEach((b) =>
        b.classList.toggle("vbtn--active", b.dataset.modalView === v)
      );
      if (window._modalChart) {
        window._modalChart.destroy();
        window._modalChart = null;
      }
      window._modalChart = mountModalChart(currentData, v);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeChartModal();
  });
}

function mountModalChart(data, type) {
  const el = document.getElementById("apexChartModal");
  if (!el) return null;
  el.innerHTML = "";

  const count = data.length;
  const isScrollable = type === "bar" && count > 7;

  if (isScrollable) {
    const barW = 80;
    const totalW = Math.max(count * barW + 80, 600);
    el.style.width = totalW + "px";
    el.style.minWidth = totalW + "px";
    el.style.height = "100%";

    setTimeout(() => {
      const inner = document.getElementById("modalScrollInner");
      const fadeL = document.getElementById("modalFadeLeft");
      const fadeR = document.getElementById("modalFadeRight");
      if (inner) {
        inner.addEventListener(
          "scroll",
          () => {
            const sl = inner.scrollLeft;
            const max = inner.scrollWidth - inner.clientWidth;
            if (fadeL) fadeL.style.opacity = sl > 8 ? "1" : "0";
            if (fadeR) fadeR.style.opacity = sl < max - 8 ? "1" : "0";
          },
          { passive: true }
        );
      }
    }, 100);
  } else {
    el.style.width = "100%";
    el.style.minWidth = "0";
    el.style.height = "100%";
  }

  const opts = buildOptions(data, type, "100%", isScrollable);
  const instance = new ApexCharts(el, opts);
  instance.render();
  return instance;
}

function openChartModal() {
  ensureModal();
  const modal = document.getElementById("chartModal");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Sync active view button in modal
  const type = chartInstance?._type || currentView;
  modal.querySelectorAll("[data-modal-view]").forEach((b) =>
    b.classList.toggle("vbtn--active", b.dataset.modalView === type)
  );

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (window._modalChart) {
        window._modalChart.destroy();
        window._modalChart = null;
      }
      const data = chartInstance?._data || currentData;
      window._modalChart = mountModalChart(data, type);
    }, 60);
  });
}

function closeChartModal() {
  const modal = document.getElementById("chartModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
  if (window._modalChart) {
    window._modalChart.destroy();
    window._modalChart = null;
  }
}

// =========================
// THEME CHANGE LISTENER
// =========================
(function observeThemeChanges() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "data-theme") {
        // Re-render charts with new theme colors
        if (chartInstance && currentData.length) {
          chartInstance.destroy();
          chartInstance = null;
          mountChart("apexChartMain", currentData, currentView, false);
        }
        if (window._modalChart && currentData.length) {
          window._modalChart.destroy();
          window._modalChart = null;
          const type = currentView;
          window._modalChart = mountModalChart(currentData, type);
        }
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
})();

// =========================
// STYLES PLACEHOLDER
// =========================
// (inject your CSS via injectStyles() here)
function injectStyles() {
  if (document.getElementById("__chartStyles")) return;
  const s = document.createElement("style");
  s.id = "__chartStyles";
  s.textContent = `

/* ---- ROOT ---- */
.chart-root {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 650px;
  height: 100%;
  background: #0a0a0a;
  border-radius: 12px;
  border: 1px solid #1a1a1a;
  overflow: hidden;
  font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ---- AMBIENT ---- */
.chart-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}
.blob-1 {
  top: -100px;
  left: 5%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
}
.blob-2 {
  bottom: -80px;
  right: 5%;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%);
}
.blob-3 {
  top: 40%;
  left: 40%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.015) 0%, transparent 70%);
}

/* ---- HEADER ---- */
.chart-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 14px;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid #1a1a1a;
}

.chart-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}
.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ededed;
  box-shadow: 0 0 0 2px rgba(237, 237, 237, 0.15);
  animation: pulse-dot 2.4s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 2px rgba(237, 237, 237, 0.15);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
    box-shadow: 0 0 0 3px rgba(237, 237, 237, 0.05);
  }
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #ededed;
  margin: 0 0 3px;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.chart-subtitle {
  font-size: 11px;
  color: #444;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ---- CONTROLS ---- */
.chart-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.view-switcher {
  display: flex;
  gap: 1px;
  background: #111;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  padding: 3px;
}

.vbtn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #555;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}
.vbtn:hover {
  color: #888;
  background: #161616;
}
.vbtn--active {
  background: #1a1a1a;
  border-color: #2a2a2a;
  color: #ededed;
  box-shadow: none;
}
.vbtn-icon {
  font-size: 11px;
  opacity: 0.7;
}
.vbtn-label {
  font-size: 10px;
}

.focus-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 7px;
  border: 1px solid #1a1a1a;
  background: transparent;
  color: #555;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}
.focus-btn:hover {
  background: #111;
  color: #888;
  border-color: #2a2a2a;
}
.focus-btn-label {
  font-size: 10px;
}

/* ---- STATS ---- */
.stats-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #1a1a1a;
  border-bottom: 1px solid #1a1a1a;
}
@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
    .chart-root {
    width:550px;
  }
}

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #0a0a0a;
  overflow: hidden;
  transition: background 0.15s ease;
}
.stat-card:hover {
  background: #0f0f0f;
}
.stat-glow {
  display: none;
}
.stat-icon {
  font-size: 14px;
  flex-shrink: 0;
  line-height: 1;
  opacity: 0.5;
}
.stat-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #444;
  margin-bottom: 3px;
  font-weight: 500;
}
.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #ededed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  letter-spacing: -0.02em;
}

/* ---- CHART SCROLL AREA ---- */
.chart-scroll-outer {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px 16px 12px;
}

.chart-scroll-inner {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
  padding-bottom: 4px;
}
.chart-scroll-inner::-webkit-scrollbar {
  height: 3px;
}
.chart-scroll-inner::-webkit-scrollbar-track {
  background: transparent;
}
.chart-scroll-inner::-webkit-scrollbar-thumb {
  background: #222;
  border-radius: 2px;
}
.chart-scroll-inner::-webkit-scrollbar-thumb:hover {
  background: #333;
}

.apex-host {
  min-height: 260px;
  height: 100%;
}

/* ---- FADE EDGES ---- */
.scroll-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40px;
  pointer-events: none;
  transition: opacity 0.25s ease;
  opacity: 0;
  z-index: 2;
}
.scroll-fade--left {
  left: 16px;
  background: linear-gradient(to right, #0a0a0a, transparent);
}
.scroll-fade--right {
  right: 16px;
  background: linear-gradient(to left, #0a0a0a, transparent);
}

/* ---- SCROLL HINT ---- */
.scroll-hint {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 0 10px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #333;
  transition: opacity 0.3s ease;
}
.scroll-hint-arrow {
  animation: bounce-x 1.8s ease-in-out infinite;
}
.scroll-hint-arrow:last-child {
  animation-delay: 0.18s;
}
@keyframes bounce-x {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.3;
  }
  50% {
    transform: translateX(3px);
    opacity: 0.8;
  }
}

/* ---- MODAL ---- */
.chart-modal-overlay {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  padding: 16px;
}

.chart-modal-box {
  position: relative;
  width: 100%;
  max-width: 1100px;
  height: 88vh;
  max-height: 820px;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 0 0 1px #000,
    0 24px 64px rgba(0, 0, 0, 0.7),
    0 8px 24px rgba(0, 0, 0, 0.5);
}

.chart-modal-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #1a1a1a;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-modal-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid #1a1a1a;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  flex-shrink: 0;
}
.modal-close-btn:hover {
  background: #111;
  border-color: #2a2a2a;
  color: #ededed;
}

/* ---- APEX OVERRIDES ---- */
.apexcharts-tooltip {
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
}
.apexcharts-xaxistooltip,
.apexcharts-yaxistooltip {
  display: none !important;
}

/* ---- DIVIDER UTILITY ---- */
.chart-divider {
  width: 100%;
  height: 1px;
  background: #1a1a1a;
}

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .chart-header {
    padding: 14px 14px 12px;
  }
  .chart-title {
    font-size: 14px;
  }
  .vbtn-label {
    display: none;
  }
  .vbtn {
    padding: 5px 8px;
  }
  .focus-btn-label {
    display: none;
  }
  .focus-btn {
    padding: 5px 9px;
  }
  .stats-row {
    padding: 0;
    gap: 1px;
  }
  .stat-card {
    padding: 12px 12px;
  }
  .stat-value {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .chart-header {
    flex-direction: column;
    align-items: stretch;
  }
  .chart-controls {
    justify-content: space-between;
  }
  .view-switcher {
    flex: 1;
    justify-content: center;
  }
}

/* ============================================================
   THEME OVERRIDES — DARK (explicit reinforcement)
   ============================================================ */

html[data-theme="dark"] .chart-root {
  background: #0a0a0a;
  border-color: #1a1a1a;
}
html[data-theme="dark"] .chart-header {
  border-bottom-color: #1a1a1a;
}
html[data-theme="dark"] .chart-title {
  color: #ededed;
}
html[data-theme="dark"] .chart-subtitle {
  color: #444;
}
html[data-theme="dark"] .chart-live-badge {
  color: #666;
}
html[data-theme="dark"] .live-dot {
  background: #ededed;
  box-shadow: 0 0 0 2px rgba(237, 237, 237, 0.15);
}
html[data-theme="dark"] .blob-1 {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
}
html[data-theme="dark"] .blob-2 {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%);
}
html[data-theme="dark"] .blob-3 {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.015) 0%, transparent 70%);
}
html[data-theme="dark"] .view-switcher {
  background: #111;
  border-color: #1a1a1a;
}
html[data-theme="dark"] .vbtn {
  color: #555;
}
html[data-theme="dark"] .vbtn:hover {
  color: #888;
  background: #161616;
}
html[data-theme="dark"] .vbtn--active {
  background: #1a1a1a;
  border-color: #2a2a2a;
  color: #ededed;
}
html[data-theme="dark"] .focus-btn {
  border-color: #1a1a1a;
  color: #555;
}
html[data-theme="dark"] .focus-btn:hover {
  background: #111;
  color: #888;
  border-color: #2a2a2a;
}
html[data-theme="dark"] .stats-row {
  background: #1a1a1a;
  border-bottom-color: #1a1a1a;
}
html[data-theme="dark"] .stat-card {
  background: #0a0a0a;
}
html[data-theme="dark"] .stat-card:hover {
  background: #0f0f0f;
}
html[data-theme="dark"] .stat-icon {
  opacity: 0.5;
}
html[data-theme="dark"] .stat-label {
  color: #444;
}
html[data-theme="dark"] .stat-value {
  color: #ededed;
}
html[data-theme="dark"] .scroll-fade--left {
  background: linear-gradient(to right, #0a0a0a, transparent);
}
html[data-theme="dark"] .scroll-fade--right {
  background: linear-gradient(to left, #0a0a0a, transparent);
}
html[data-theme="dark"] .scroll-hint {
  color: #333;
}
html[data-theme="dark"] .chart-scroll-inner {
  scrollbar-color: #222 transparent;
}
html[data-theme="dark"] .chart-scroll-inner::-webkit-scrollbar-thumb {
  background: #222;
}
html[data-theme="dark"] .chart-scroll-inner::-webkit-scrollbar-thumb:hover {
  background: #333;
}
html[data-theme="dark"] .chart-modal-overlay {
  background: rgba(0, 0, 0, 0.75);
}
html[data-theme="dark"] .chart-modal-box {
  background: #0a0a0a;
  border-color: #1a1a1a;
  box-shadow:
    0 0 0 1px #000,
    0 24px 64px rgba(0, 0, 0, 0.7),
    0 8px 24px rgba(0, 0, 0, 0.5);
}
html[data-theme="dark"] .chart-modal-header {
  border-bottom-color: #1a1a1a;
}
html[data-theme="dark"] .modal-close-btn {
  border-color: #1a1a1a;
  color: #555;
}
html[data-theme="dark"] .modal-close-btn:hover {
  background: #111;
  border-color: #2a2a2a;
  color: #ededed;
}
html[data-theme="dark"] .chart-divider {
  background: #1a1a1a;
}

/* ============================================================
   THEME OVERRIDES — LIGHT
   ============================================================ */

html[data-theme="light"] .chart-root {
  background: #fafafa;
  border-color: #e4e4e4;
}
html[data-theme="light"] .chart-header {
  border-bottom-color: #e8e8e8;
}
html[data-theme="light"] .chart-title {
  color: #111;
}
html[data-theme="light"] .chart-subtitle {
  color: #999;
}
html[data-theme="light"] .chart-live-badge {
  color: #999;
}
html[data-theme="light"] .live-dot {
  background: #111;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  /* Override the animation keyframes shadow for light mode */
  animation: pulse-dot-light 2.4s ease-in-out infinite;
}
@keyframes pulse-dot-light {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.03);
  }
}
html[data-theme="light"] .blob-1 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.03) 0%, transparent 70%);
}
html[data-theme="light"] .blob-2 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.02) 0%, transparent 70%);
}
html[data-theme="light"] .blob-3 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.015) 0%, transparent 70%);
}
html[data-theme="light"] .view-switcher {
  background: #f0f0f0;
  border-color: #e4e4e4;
}
html[data-theme="light"] .vbtn {
  color: #999;
}
html[data-theme="light"] .vbtn:hover {
  color: #333;
  background: #e8e8e8;
}
html[data-theme="light"] .vbtn--active {
  background: #e0e0e0;
  border-color: #d0d0d0;
  color: #111;
}
html[data-theme="light"] .vbtn-icon {
  opacity: 0.5;
}
html[data-theme="light"] .focus-btn {
  border-color: #e4e4e4;
  color: #999;
}
html[data-theme="light"] .focus-btn:hover {
  background: #f0f0f0;
  color: #333;
  border-color: #d0d0d0;
}
html[data-theme="light"] .stats-row {
  background: #e8e8e8;
  border-bottom-color: #e8e8e8;
}
html[data-theme="light"] .stat-card {
  background: #fafafa;
}
html[data-theme="light"] .stat-card:hover {
  background: #f4f4f4;
}
html[data-theme="light"] .stat-icon {
  opacity: 0.35;
}
html[data-theme="light"] .stat-label {
  color: #aaa;
}
html[data-theme="light"] .stat-value {
  color: #111;
}
html[data-theme="light"] .scroll-fade--left {
  background: linear-gradient(to right, #fafafa, transparent);
}
html[data-theme="light"] .scroll-fade--right {
  background: linear-gradient(to left, #fafafa, transparent);
}
html[data-theme="light"] .scroll-hint {
  color: #bbb;
}
html[data-theme="light"] .chart-scroll-inner {
  scrollbar-color: #ccc transparent;
}
html[data-theme="light"] .chart-scroll-inner::-webkit-scrollbar-thumb {
  background: #ccc;
}
html[data-theme="light"] .chart-scroll-inner::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
html[data-theme="light"] .chart-modal-overlay {
  background: rgba(255, 255, 255, 0.6);
}
html[data-theme="light"] .chart-modal-box {
  background: #fafafa;
  border-color: #e4e4e4;
  box-shadow:
    0 0 0 1px #e0e0e0,
    0 24px 64px rgba(0, 0, 0, 0.1),
    0 8px 24px rgba(0, 0, 0, 0.06);
}
html[data-theme="light"] .chart-modal-header {
  border-bottom-color: #e8e8e8;
}
html[data-theme="light"] .modal-close-btn {
  border-color: #e4e4e4;
  color: #999;
}
html[data-theme="light"] .modal-close-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #ef4444;
}
html[data-theme="light"] .chart-divider {
  background: #e8e8e8;
}
  `;
  document.head.appendChild(s);
}


// Compat
function setChart() {
  renderBarChart(getSortedCouncilData());
}