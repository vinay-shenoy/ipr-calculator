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
// My Name is Vinay Shenoy.
function calculateIPR() {
  // Input values
  const o = parseFloat(document.getElementById("txtPoro").value) || 0;
  const k = parseFloat(document.getElementById("txtPerm").value) || 0;
  const h = parseFloat(document.getElementById("txtPayz").value) || 0;
  const P = parseFloat(document.getElementById("txtResP").value) || 0;
  const Pb = parseFloat(document.getElementById("txtBubl").value) || 0;
  const Bo = parseFloat(document.getElementById("txtBo").value) || 0;
  const u = parseFloat(document.getElementById("txtMu").value) || 0;
  const Ct = parseFloat(document.getElementById("txtCt").value) || 0;
  const A = parseFloat(document.getElementById("txtArea").value) || 0;
  const rw = parseFloat(document.getElementById("txtRadi").value) || 0;
  const S = parseFloat(document.getElementById("txtSkin").value) || 0;
  const ti = parseFloat(document.getElementById("txtTime").value) || 0;

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

  renderChart(chartPoints, qb + qv + 500, P + 500);
}

function renderChart(points, maxX, maxY) {
  const ctx = document.getElementById("iprChart").getContext("2d");

  if (iprChartInstance) {
    iprChartInstance.destroy();
  }

  iprChartInstance = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "IPR Curve",
          data: points,
          showLine: true,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          borderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: maxX,
          title: {
            display: true,
            text: "Flow Rate q (STB/day)",
          },
        },
        y: {
          min: 0,
          max: maxY,
          title: {
            display: true,
            text: "Bottomhole Pressure Pwf (psi)",
          },
        },
      },
    },
  });
}

// Initial calculation on page load
window.onload = calculateIPR;
