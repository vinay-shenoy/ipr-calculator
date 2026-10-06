let iprChartInstance = null;

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
  const re = parseFloat(document.getElementById("drainage_radius").value) || 0;
  const rw = parseFloat(document.getElementById("well_radius").value) || 0;
  const S = parseFloat(document.getElementById("skin").value) || 0;
  const ti = parseFloat(document.getElementById("time").value) || 0;
  const flowRegime = document.getElementById("flowRegime").value;
  const unitText = document.getElementById("button2").innerText.trim();

  let x;
  let y;
  let J;
  let qv;
  let qb;
  let t = 0;

  if (flowRegime === "Transient Flow") {
    if (unitText === "years") {
      t = ti * 8760;
    } else if (unitText === "months") {
      t = ti * 730;
    } else if (unitText === "days") {
      t = ti * 24;
    } else if (unitText === "weeks") {
      t = ti * 168;
    } else if (unitText === "hrs") {
      t = ti;
    } else if (unitText === "minutes") {
      t = ti / 60;
    } else if (unitText === "seconds") {
      t = ti / 3600;
    }

    if (t <= 0) {
      t = 0.000001;
    }

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

  console.log(
    "Productivity Index J = " + J + " | Pb = " + Pb + " | qv = " + qv,
  );

  qb = J * (P - Pb);

  document.getElementById("txtJ").innerText = J.toFixed(4);
  document.getElementById("txtqv").innerText = qv.toFixed(2);
  document.getElementById("txtqb").innerText = qb.toFixed(2);

  const chartPoints = [];

  for (let i = 0; i <= 10; i++) {
    const yVal = (i * Pb) / 10;

    const xVal = qb + qv * (1 - 0.2 * (i / 10) - 0.8 * Math.pow(i / 10, 2));

    chartPoints.push({
      x: xVal,
      y: yVal,
    });
  }

  chartPoints.push({
    x: 0,
    y: P,
  });

  chartPoints.sort((a, b) => a.x - b.x);

  const calculatedMaxX = Math.max(...chartPoints.map((point) => point.x), 0);
  const calculatedMaxY = Math.max(...chartPoints.map((point) => point.y), 0);
  const maxX = calculatedMaxX + Math.max(calculatedMaxX * 0.05, 100);
  const maxY = calculatedMaxY + Math.max(calculatedMaxY * 0.05, 100);

  renderChart(chartPoints, maxX, maxY);
}

function niceStep(value) {
  if (!isFinite(value) || value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const fraction = value / magnitude;

  let niceFraction;

  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * magnitude;
}

function getAxisConfiguration(maxValue, numberOfBlocks) {
  const rawStep = maxValue / numberOfBlocks;
  const step = niceStep(rawStep);
  const axisMax = step * numberOfBlocks;

  return {
    step: step,
    max: axisMax,
    blocks: numberOfBlocks,
  };
}

function getGridConfiguration(maxX, maxY) {
  let bestConfiguration = null;

  for (let blocks = 5; blocks <= 10; blocks++) {
    const xAxis = getAxisConfiguration(maxX, blocks);

    const yAxis = getAxisConfiguration(maxY, blocks);

    const xWaste = maxX > 0 ? (xAxis.max - maxX) / maxX : 0;
    const yWaste = maxY > 0 ? (yAxis.max - maxY) / maxY : 0;
    const totalWaste = xWaste + yWaste;

    if (bestConfiguration === null || totalWaste < bestConfiguration.waste) {
      bestConfiguration = {
        blocks: blocks,

        xStep: xAxis.step,
        xMax: xAxis.max,
        yStep: yAxis.step,
        yMax: yAxis.max,
        waste: totalWaste,
      };
    }
  }

  return bestConfiguration;
}

function renderChart(points, maxX, maxY) {
  const canvas = document.getElementById("iprChart");

  const ctx = canvas.getContext("2d");

  if (iprChartInstance) {
    iprChartInstance.destroy();
  }

  const gridConfig = getGridConfiguration(maxX, maxY);
  const xStep = gridConfig.xStep;
  const yStep = gridConfig.yStep;
  const xMax = gridConfig.xMax;
  const yMax = gridConfig.yMax;

  const numberOfBlocks = gridConfig.blocks;

  const pointValuePlugin = {
    id: "pointValuePlugin",

    afterDatasetsDraw(chart) {
      const { ctx, width } = chart;
      const fontSize = width < 450 ? 8 : 10;
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
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = `(${Math.round(data.x)}, ${Math.round(data.y)})`;
          ctx.fillText(label, x + 35, y);
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

    plugins: [squareGridPlugin, pointValuePlugin],

    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.2,

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

        legend: {
          display: false,
        },
      },

      layout: {
        padding: {
          top: 20,
          right: 25,
          bottom: 15,
          left: 10,
        },
      },

      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: xMax,
          title: {
            display: true,
            text: "Flow Rate q (STB/day)",
            font: {
              size: 12,
              weight: "bold",
            },
          },

          ticks: {
            stepSize: xStep,
            maxRotation: 45,
            minRotation: 0,
            callback: function (value) {
              return Number(value).toLocaleString();
            },
          },

          grid: {
            display: false,
          },

          border: {
            display: true,
            color: "#000000",
            width: 1,
          },
        },

        y: {
          type: "linear",
          position: "left",
          min: 0,
          max: yMax,
          title: {
            display: true,
            text: "Bottomhole Pressure Pwf (psi)",
            font: {
              size: 12,
              weight: "bold",
            },
          },

          ticks: {
            stepSize: yStep,
            callback: function (value) {
              return Number(value).toLocaleString();
            },
          },

          grid: {
            display: false,
          },

          border: {
            display: true,
            color: "#000000",
            width: 1,
          },
        },
      },
    },
  });
}

const squareGridPlugin = {
  id: "squareGridPlugin",

  beforeDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    const yScale = scales.y;

    if (!xScale || !yScale || !chartArea) {
      return;
    }

    const xMin = xScale.min;
    const xMax = xScale.max;
    const yMin = yScale.min;
    const yMax = yScale.max;
    const xStep = xScale.options.ticks.stepSize / 2;
    const yStep = yScale.options.ticks.stepSize / 2;

    if (!xStep || !yStep) {
      return;
    }

    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(37, 99, 235, 0.25)";

    for (let value = xMin; value <= xMax + xStep * 0.001; value += xStep) {
      const pixel = xScale.getPixelForValue(value);

      if (pixel < chartArea.left || pixel > chartArea.right) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(pixel, chartArea.top);
      ctx.lineTo(pixel, chartArea.bottom);
      ctx.stroke();
    }

    for (let value = yMin; value <= yMax + yStep * 0.001; value += yStep) {
      const pixel = yScale.getPixelForValue(value);

      if (pixel < chartArea.top || pixel > chartArea.bottom) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(chartArea.left, pixel);
      ctx.lineTo(chartArea.right, pixel);
      ctx.stroke();
    }

    ctx.lineWidth = 0.4;
    ctx.strokeStyle = "rgba(37, 99, 235, 0.12)";

    const xMinorStep = xStep / 5;
    const yMinorStep = yStep / 5;

    for (
      let value = xMin + xMinorStep;
      value < xMax - xMinorStep * 0.001;
      value += xMinorStep
    ) {
      // Check if this is a major line

      const majorRatio = value / xStep;

      if (Math.abs(majorRatio - Math.round(majorRatio)) < 0.000001) {
        continue;
      }

      const pixel = xScale.getPixelForValue(value);

      if (pixel < chartArea.left || pixel > chartArea.right) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(pixel, chartArea.top);
      ctx.lineTo(pixel, chartArea.bottom);
      ctx.stroke();
    }

    for (
      let value = yMin + yMinorStep;
      value < yMax - yMinorStep * 0.001;
      value += yMinorStep
    ) {
      // Check if this is a major line

      const majorRatio = value / yStep;

      if (Math.abs(majorRatio - Math.round(majorRatio)) < 0.000001) {
        continue;
      }

      const pixel = yScale.getPixelForValue(value);

      if (pixel < chartArea.top || pixel > chartArea.bottom) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(chartArea.left, pixel);
      ctx.lineTo(chartArea.right, pixel);
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
