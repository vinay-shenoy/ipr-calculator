let iprChartInstance = null;

const UNITS = ["hrs", "minutes", "seconds", "years", "months", "weeks", "days"];
const HOURS = {
  hrs: 1,
  minutes: 1 / 60,
  seconds: 1 / 3600,
  years: 8760,
  months: 730,
  weeks: 168,
  days: 24,
};

function toggleTimeUnit() {
  const btn = document.getElementById("button2");
  const next = UNITS[(UNITS.indexOf(btn.innerText.trim()) + 1) % UNITS.length];
  btn.innerText = next;
  if (next === "months") alert("Assuming 1 month = 730hrs");
  calculateIPR();
}

const val = (id) => parseFloat(document.getElementById(id).value) || 0;

function calculateIPR() {
  const o = val("porosity"),
    k = val("permeability"),
    h = val("pay_thickness");
  const P = val("reservoir_pressure"),
    Pb = val("bubble_pressure");
  const Bo = val("oil_formation_volume_factor"),
    u = val("viscosity");
  const Ct = val("compressibility"),
    re = val("drainage_radius");
  const rw = val("well_radius"),
    S = val("skin"),
    ti = val("time");
  const regime = document.getElementById("flowRegime").value;
  const unit = document.getElementById("button2").innerText.trim();

  document.getElementById("time-transient").style.display =
    regime === "Transient Flow" ? "block" : "none";

  let y;
  if (regime === "Transient Flow") {
    let t = ti * (HOURS[unit] || 1);
    if (t <= 0) t = 0.000001;
    const x = k / (o * u * Ct * rw * rw);
    y = 162.6 * Bo * u * (Math.log10(t) + Math.log10(x) - 3.23);
  } else if (regime === "Steady State Flow") {
    y = 141.2 * Bo * u * (Math.log(re / rw) + S);
  } else {
    y = 141.2 * Bo * u * (Math.log(re / rw) - 0.75 + S);
  }

  const J = (k * h) / y;
  const qv = (J * Pb) / 1.8;
  const qb = J * (P - Pb);

  document.getElementById("txtJ").innerText = J.toFixed(4);
  document.getElementById("txtqv").innerText = qv.toFixed(2);
  document.getElementById("txtqb").innerText = qb.toFixed(2);

  const points = [];
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    points.push({ x: qb + qv * (1 - 0.2 * f - 0.8 * f * f), y: f * Pb });
  }
  points.push({ x: 0, y: P });
  points.sort((a, b) => a.x - b.x);

  const maxX = Math.max(...points.map((p) => p.x), 0);
  const maxY = Math.max(...points.map((p) => p.y), 0);
  renderChart(
    points,
    maxX + Math.max(maxX * 0.05, 100),
    maxY + Math.max(maxY * 0.05, 100),
  );
}

function niceStep(value) {
  if (!isFinite(value) || value <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

function getAxisConfiguration(maxValue, blocks) {
  const step = niceStep(maxValue / blocks);
  return { step, max: step * blocks };
}

function getGridConfiguration(maxX, maxY) {
  let best = null;
  for (let blocks = 5; blocks <= 10; blocks++) {
    const xAxis = getAxisConfiguration(maxX, blocks);
    const yAxis = getAxisConfiguration(maxY, blocks);
    const waste =
      (maxX > 0 ? (xAxis.max - maxX) / maxX : 0) +
      (maxY > 0 ? (yAxis.max - maxY) / maxY : 0);
    if (best === null || waste < best.waste) {
      best = {
        blocks,
        xStep: xAxis.step,
        xMax: xAxis.max,
        yStep: yAxis.step,
        yMax: yAxis.max,
        waste,
      };
    }
  }
  return best;
}

// Square graph-paper grid: major lines every half tick step, minor lines every fifth of that
const squareGridPlugin = {
  id: "squareGridPlugin",
  beforeDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x,
      yScale = scales.y;
    if (!xScale || !yScale || !chartArea) return;

    const xStep = xScale.options.ticks.stepSize / 2;
    const yStep = yScale.options.ticks.stepSize / 2;
    if (!xStep || !yStep) return;

    const drawLines = (
      scale,
      min,
      max,
      step,
      vertical,
      skipMajor,
      majorStep,
    ) => {
      for (let v = min; v <= max + step * 0.001; v += step) {
        if (skipMajor) {
          const r = v / majorStep;
          if (Math.abs(r - Math.round(r)) < 0.000001) continue;
        }
        const p = scale.getPixelForValue(v);
        if (
          vertical
            ? p < chartArea.left || p > chartArea.right
            : p < chartArea.top || p > chartArea.bottom
        )
          continue;
        ctx.beginPath();
        if (vertical) {
          ctx.moveTo(p, chartArea.top);
          ctx.lineTo(p, chartArea.bottom);
        } else {
          ctx.moveTo(chartArea.left, p);
          ctx.lineTo(chartArea.right, p);
        }
        ctx.stroke();
      }
    };

    ctx.save();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(77, 163, 117, 0.7)";
    drawLines(xScale, xScale.min, xScale.max, xStep, true, false, xStep);
    drawLines(yScale, yScale.min, yScale.max, yStep, false, false, yStep);

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(138, 255, 193,0.7)";
    drawLines(
      xScale,
      xScale.min + xStep / 5,
      xScale.max - (xStep / 5) * 0.001,
      xStep / 5,
      true,
      true,
      xStep,
    );
    drawLines(
      yScale,
      yScale.min + yStep / 5,
      yScale.max - (yStep / 5) * 0.001,
      yStep / 5,
      false,
      true,
      yStep,
    );
    ctx.restore();
  },
};

const pointValuePlugin = {
  id: "pointValuePlugin",
  afterDatasetsDraw(chart) {
    const { ctx, width } = chart;
    chart.data.datasets.forEach((ds, di) => {
      chart.getDatasetMeta(di).data.forEach((pt, i) => {
        const d = ds.data[i];
        if (!d) return;
        ctx.save();
        ctx.font = `700 ${width < 450 ? 8 : 10}px "Space Mono", monospace`;
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `(${Math.round(d.x)}, ${Math.round(d.y)})`,
          pt.x + 38,
          pt.y,
        );
        ctx.restore();
      });
    });
  },
};

function renderChart(points, maxX, maxY) {
  if (iprChartInstance) iprChartInstance.destroy();
  const g = getGridConfiguration(maxX, maxY);
  const xa = { step: g.xStep, max: g.xMax },
    ya = { step: g.yStep, max: g.yMax };
  const axis = (text, a) => ({
    type: "linear",
    min: 0,
    max: a.max,
    title: {
      display: true,
      text,
      color: "#000",
      font: { family: "Space Mono", size: 14, weight: "bold" },
    },
    ticks: {
      stepSize: a.step,
      color: "#000",
      font: { family: "Space Mono" },
      callback: (v) => Number(v).toLocaleString(),
    },
    grid: { display: false },
    border: { display: true, color: "#000", width: 3 },
  });

  iprChartInstance = new Chart(
    document.getElementById("iprChart").getContext("2d"),
    {
      type: "line",
      data: {
        datasets: [
          {
            label: "IPR Curve",
            data: points,
            showLine: true,
            borderColor: "#2a4bff",
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: "#ff9ec7",
            pointBorderColor: "#000",
            pointBorderWidth: 2,
            tension: 0.1,
          },
        ],
      },
      plugins: [squareGridPlugin, pointValuePlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20, right: 40, bottom: 10, left: 10 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: () => null,
              label: (c) => [
                `q: ${Math.round(c.raw.x * 100) / 100} STB/day`,
                `Pwf: ${Math.round(c.raw.y * 100) / 100} psi`,
              ],
            },
          },
        },
        scales: {
          x: axis("Flow Rate q (STB/day)", xa),
          y: axis("Bottomhole Pressure Pwf (psi)", ya),
        },
      },
    },
  );
}

function saveIPRChart() {
  if (!iprChartInstance) {
    alert("Please generate the IPR chart first.");
    return;
  }

  const chartWidth = 700;
  const chartHeight = 600;
  const padding = 40;

  // Save the current chart dimensions
  const originalWidth = iprChartInstance.width;
  const originalHeight = iprChartInstance.height;

  // Temporarily disable responsive resizing
  const originalResponsive = iprChartInstance.options.responsive;
  const originalMaintainAspectRatio =
    iprChartInstance.options.maintainAspectRatio;

  iprChartInstance.options.responsive = false;
  iprChartInstance.options.maintainAspectRatio = false;

  // Resize and re-render at the required dimensions
  iprChartInstance.resize(chartWidth, chartHeight);
  iprChartInstance.update("none");

  // Capture the newly rendered chart
  const chartImage = new Image();

  chartImage.onload = function () {
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");

    exportCanvas.width = chartWidth + padding * 2;
    exportCanvas.height = chartHeight + padding * 2;

    // White background
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the chart at its full rendered resolution
    exportCtx.drawImage(chartImage, padding, padding, chartWidth, chartHeight);

    // Download
    const link = document.createElement("a");
    link.download = "IPR_Chart.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();

    // Restore the chart's original settings and size
    iprChartInstance.options.responsive = originalResponsive;
    iprChartInstance.options.maintainAspectRatio = originalMaintainAspectRatio;

    iprChartInstance.resize(originalWidth, originalHeight);
    iprChartInstance.update("none");
  };

  chartImage.onerror = function () {
    iprChartInstance.options.responsive = originalResponsive;
    iprChartInstance.options.maintainAspectRatio = originalMaintainAspectRatio;

    iprChartInstance.resize(originalWidth, originalHeight);
    iprChartInstance.update("none");

    alert("Unable to export the IPR chart.");
  };

  chartImage.src = iprChartInstance.toBase64Image("image/png", 1);
}

window.onload = calculateIPR;
window.onchange = calculateIPR;
