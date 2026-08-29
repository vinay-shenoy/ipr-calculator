let iprChartInstance = null;

// Time Button Toggle Sequence
function toggleTimeUnit() {
  const btn = document.getElementById("button2");
  const units = [
    "hrs",
    "minutes",
    "seconds",
    "years",
    "months",
    "weeks",
    "days",
  ];
  let currentIndex = units.indexOf(btn.innerText.trim());

  let nextIndex = (currentIndex + 1) % units.length;
  btn.innerText = units[nextIndex];

  if (units[nextIndex] === "months") {
    alert("Assuming 1 month = 730hrs");
  }
}

function calculateIPR() {
  // Input values
  const o = parseFloat(document.getElementById("porosity").value) || 0;
  const k = parseFloat(document.getElementById("permeability").value) || 0;
  const h = parseFloat(document.getElementById("pay_thickness").value) || 0;
  const P =
    parseFloat(document.getElementById("reservoir_pressure").value) || 0;
  const Pb = parseFloat(document.getElementById("bubble_pressure").value) || 0;
  const Bo =
    parseFloat(document.getElementById("oil_formation_volume_factor").value) ||
    0;
  const u = parseFloat(document.getElementById("viscosity").value) || 0;
  const Ct = parseFloat(document.getElementById("compressibility").value) || 0;
  // const A = parseFloat(document.getElementById("area").value) || 0;
  const re = parseFloat(document.getElementById("drainage_radius").value) || 0;
  const rw = parseFloat(document.getElementById("well_radius").value) || 0;
  const S = parseFloat(document.getElementById("skin").value) || 0;
  const ti = parseFloat(document.getElementById("time").value) || 0;

  const flowRegime = document.getElementById("flowRegime").value;
  const unitText = document.getElementById("button2").innerText.trim();

  let x,
    y,
    J,
    qv,
    qb,
    t = 0;

  if (flowRegime === "Transient Flow") {
    // Time unit conversion to hours
    if (unitText === "years") t = ti * 8760;
    else if (unitText === "months") t = ti * 730;
    else if (unitText === "days") t = ti * 24;
    else if (unitText === "weeks") t = ti * 168;
    else if (unitText === "hrs") t = ti;
    else if (unitText === "minutes") t = ti / 60;
    else if (unitText === "seconds") t = ti / 3600;

    x = k / (o * u * Ct * rw * rw);
    y = 162.6 * Bo * u * (Math.log10(t) + Math.log10(x) - 3.23);
    J = (k * h) / y;
  } else if (flowRegime === "Steady State Flow") {
    x = re / rw;
    y = 141.2 * Bo * u * (Math.log(x) + S);
    J = (k * h) / y;
  } else if (flowRegime === "Pseudo-Steady State Flow") {
    x = re / rw;
    y = 141.2 * Bo * u * (Math.log(x) - 0.75 + S);
    J = (k * h) / y;
  }

  qv = (J * Pb) / 1.8;
  qb = J * (P - Pb);

  // Update Text Outputs
  document.getElementById("txtJ").innerText = J.toFixed(4);
  document.getElementById("txtqv").innerText = qv.toFixed(2);
  document.getElementById("txtqb").innerText = qb.toFixed(2);

  // Calculate Curve Points
  const chartPoints = [];

  for (let i = 0; i <= 10; i++) {
    const yVal = (i * Pb) / 10;
    const xVal = qb + qv * (1 - 0.2 * (i / 10) - 0.8 * Math.pow(i / 10, 2));
    chartPoints.push({ x: xVal, y: yVal });
  }

  // Endpoint (x = 0, y = P)
  chartPoints.push({ x: 0, y: P });

  // Sort points by X ascending for clean rendering
  chartPoints.sort((a, b) => a.x - b.x);

  renderChart(
    chartPoints,
    roundToNearest1000(qb + qv + 500),
    roundToNearest1000(P + 500),
  );
}

function roundToNearest1000(value) {
  return Math.max(1000, Math.round(value / 1000) * 1000);
}

function renderChart(points, maxX, maxY) {
  const canvas = document.getElementById("iprChart");
  const ctx = canvas.getContext("2d");

  if (iprChartInstance) {
    iprChartInstance.destroy();
  }

  const step = 1000;
  // FIXED: Correctly find maximum axis dimension to maintain a 1:1 square grid scale
  const maxPoint = Math.ceil(Math.max(maxX, maxY) / step) * step;

  // Dynamic point labeling plugin with viewport detection
  const pointValuePlugin = {
    id: "pointValuePlugin",
    afterDatasetsDraw(chart) {
      const { ctx, width } = chart;
      // Adjust font size based on current canvas width for mobile readability
      const fontSize = width < 450 ? 8 : 10;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);

        meta.data.forEach((point, index) => {
          const data = dataset.data[index];

          if (!data || data.x === undefined || data.y === undefined) return;

          const x = point.x;
          const y = point.y;

          ctx.save();
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";

          const label = `(${Math.round(data.x)}, ${Math.round(data.y)})`;
          ctx.fillText(label, x - 6, y - 4);
          ctx.restore();
        });
      });
    },
  };

  iprChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "IPR Curve",
          data: points,
          showLine: true,
          borderColor: "#2563eb",
          backgroundColor: "#eb3225",
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#eb3225",
          pointBorderColor: "#000000",
          pointBorderWidth: 1,
          tension: 0.1,
        },
      ],
    },
    plugins: [millimeterGridPlugin, pointValuePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1, // Ensures perfect 1:1 box ratio
      plugins: {
        tooltip: {
          callbacks: {
            title: () => null,
            label: (context) => {
              const point = context.raw;
              return [
                `q: ${Math.round(point.x * 100) / 100} STB/day`,
                `Pwf: ${Math.round(point.y * 100) / 100} psi`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: maxPoint,
          title: {
            display: true,
            text: "Flow Rate q (STB/day)",
            font: { size: 12, weight: "bold" },
          },
          grid: {
            color: "#25eb8f", // Color of major grid lines
            lineWidth: 1,
            drawBorder: true,
            borderColor: "#000000",
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            stepSize: step,
          },
        },
        y: {
          type: "linear",
          min: 0,
          max: maxPoint,
          ticks: {
            stepSize: step,
          },
          title: {
            display: true,
            text: "Bottomhole Pressure Pwf (psi)",
            font: { size: 12, weight: "bold" },
          },
          grid: {
            color: "#25eb8f", // Color of major grid lines
            lineWidth: 1,
            drawBorder: true,
            borderColor: "#000000",
          },
        },
      },
    },
  });
}

const millimeterGridPlugin = {
  id: "millimeterGridPlugin",
  beforeDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    const yScale = scales.y;

    if (!xScale || !yScale) return;

    ctx.save();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(37, 99, 235, 0.2)"; // Soft minor grid line color

    // Draw minor vertical lines (every 100 units)
    const xStep = 100;
    for (let xVal = xScale.min; xVal <= xScale.max; xVal += xStep) {
      if (xVal % 1000 === 0) continue; // Skip major grid lines
      const xPixel = xScale.getPixelForValue(xVal);
      ctx.beginPath();
      ctx.moveTo(xPixel, chartArea.top);
      ctx.lineTo(xPixel, chartArea.bottom);
      ctx.stroke();
    }

    // Draw minor horizontal lines (every 100 units)
    const yStep = 100;
    for (let yVal = yScale.min; yVal <= yScale.max; yVal += yStep) {
      if (yVal % 1000 === 0) continue; // Skip major grid lines
      const yPixel = yScale.getPixelForValue(yVal);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yPixel);
      ctx.lineTo(chartArea.right, yPixel);
      ctx.stroke();
    }

    ctx.restore();
  },
};
function saveIPRChart() {
  if (!iprChartInstance) {
    alert("Please generate the IPR chart first.");
    return;
  }

  const chartImage = new Image();

  chartImage.onload = function () {
    const padding = 40;
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");

    exportCanvas.width = chartImage.width + padding * 2;
    exportCanvas.height = chartImage.height + padding * 2;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(chartImage, padding, padding);

    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = "IPR_Chart.png";
    link.click();
  };

  chartImage.src = iprChartInstance.toBase64Image();
}

window.onload = calculateIPR;
