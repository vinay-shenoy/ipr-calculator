let iprChartInstance = null;

// Time Button Toggle Sequence
function toggleTimeUnit() {
  const btn = document.getElementById("button2");
  if (btn.innerText === "hrs") {
    btn.innerText = "minutes";
  } else if (btn.innerText === "minutes") {
    btn.innerText = "seconds";
  } else if (btn.innerText === "seconds") {
    btn.innerText = "years";
  } else if (btn.innerText === "years") {
    btn.innerText = "months";
    alert("Assuming 1 month = 730hrs");
  } else if (btn.innerText === "months") {
    btn.innerText = "weeks";
  } else if (btn.innerText === "weeks") {
    btn.innerText = "days";
  } else if (btn.innerText === "days") {
    btn.innerText = "hrs";
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
  const A = parseFloat(document.getElementById("area").value) || 0;
  const rw = parseFloat(document.getElementById("well_radius").value) || 0;
  const S = parseFloat(document.getElementById("skin").value) || 0;
  const ti = parseFloat(document.getElementById("time").value) || 0;

  const flowRegime = document.getElementById("flowRegime").value;
  const unitText = document.getElementById("button2").innerText;

  let x,
    y,
    J,
    qv,
    qb,
    t = 0;
  const re = Math.sqrt((A * 43560) / Math.PI);

  if (flowRegime === "Transient Flow") {
    // Time unit conversion to hours
    if (unitText === "years") t = ti * 8760;
    else if (unitText === "months") t = ti * 730;
    else if (unitText === "days") t = ti * 24;
    else if (unitText === "weeks") t = ti * 168;
    else if (unitText === "hrs") t = ti;
    else if (unitText === "minutes") t = ti / 60;
    else if (unitText === "seconds") t = ti / 3600; // Corrected seconds conversion

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
  const yValues = [];
  const xValues = [];

  for (let i = 0; i <= 10; i++) {
    const yVal = (i * Pb) / 10;
    const xVal = qb + qv * (1 - 0.2 * (i / 10) - 0.8 * Math.pow(i / 10, 2));

    yValues.push(yVal);
    xValues.push(xVal);
    chartPoints.push({ x: xVal, y: yVal });
  }

  // Endpoint (xp = 0, yp = P)
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
  return Math.round(value / 1000) * 1000;
}

function renderChart(points, maxX, maxY) {
  const canvas = document.getElementById("iprChart");
  const ctx = canvas.getContext("2d");

  if (iprChartInstance) {
    iprChartInstance.destroy();
  }

  // Force canvas aspect ratio
  // if (maxX > 0 && maxY > 0) {
  //   canvas.style.aspectRatio = `${maxX} / ${maxY}`;
  // }

  let maxPoint = maxX;
  if (maxPoint < maxX) {
    maxPoint = maxY;
  }

  // Custom plugin to display values near points
  const pointValuePlugin = {
    id: "pointValuePlugin",

    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);

        meta.data.forEach((point, index) => {
          const data = dataset.data[index];

          if (!data || data.x === undefined || data.y === undefined) {
            return;
          }

          const x = point.x;
          const y = point.y;

          ctx.save();

          ctx.font = "10px Helvetica";
          ctx.fillStyle = "#000000";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          // Display X and Y values
          const label = `(${Math.round(data.x * 100) / 100}, ${Math.round(data.y * 100) / 100})`;

          // Position label slightly above and to the right of point
          ctx.fillText(label, x - 15, y + 5);

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
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#eb3225",
          pointBorderColor: "#000000",
          pointBorderWidth: 1,
        },
      ],
    },
    plugins: [pointValuePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              return null;
            },

            label: function (context) {
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
          },
        },
        y: {
          min: 0,
          max: maxPoint,
          title: {
            display: true,
            text: "Bottomhole flow Pressure Pwf (psi)",
          },
        },
      },
    },
  });
}

function saveIPRChart() {
  if (!iprChartInstance) {
    alert("Please generate the IPR chart first.");
    return;
  }

  // Get chart image
  const chartImage = new Image();

  chartImage.onload = function () {
    // Padding around the chart
    const padding = 50;

    // Create new canvas
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");

    // Increase canvas size by padding
    exportCanvas.width = chartImage.width + padding * 2;
    exportCanvas.height = chartImage.height + padding * 2;

    // White background
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw chart with padding
    exportCtx.drawImage(chartImage, padding, padding);

    // Create download link
    const link = document.createElement("a");

    link.href = exportCanvas.toDataURL("image/png");
    link.download = "IPR_Chart.png";

    link.click();
  };

  // Get Chart.js image
  chartImage.src = iprChartInstance.toBase64Image();
}
