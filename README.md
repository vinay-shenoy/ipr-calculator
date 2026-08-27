# IPR Calculator — Inflow Performance Relationship

A petroleum engineering web application for calculating the **Productivity Index (J<sup>*</sup>)** and generating an **Inflow Performance Relationship (IPR)** curve for an oil well.

## 1. Purpose

The application follows this engineering workflow:

**Reservoir / Well Data → Calculate J<sup>*</sup> → Calculate q<sub>b</sub> and q<sub>max</sub> → Generate q vs. p<sub>wf</sub> points → Plot IPR Curve**

Where:

- **q** = production rate, STB/day
- **p<sub>wf</sub>** = flowing bottomhole pressure, psi
- **p<sub>r</sub>** = reservoir pressure, psi
- **p<sub>b</sub>** = bubble-point pressure, psi
- **J<sup>*</sup>** = productivity index, STB/(day·psi)
- **q<sub>b</sub>** = production rate at bubble point, STB/day
- **q<sub>max</sub>** = theoretical maximum rate, STB/day

## 2. IPR Concept

**IPR (Inflow Performance Relationship)** describes the relationship between production rate and flowing bottomhole pressure:

\[
q=f(p<sub>wf</sub>)
\]

For a linear inflow relationship:

\[
q = J * (p<sub>r</sub> - p<sub>wf</sub>)
\]

When \(p<sub>wf</sub>=p<sub>r</sub>\), drawdown is zero and \(q=0\).

A useful teaching analogy is a water tank connected to a pipe: the reservoir is the tank, the well is the flow path, flowing bottomhole pressure is the outlet pressure, and production rate is the flow rate. Increasing the pressure difference increases flow.

## 3. Important Pressures

### Reservoir Pressure — p<sub>r</sub>

Reservoir pressure is the pressure available in the reservoir.

### Flowing Bottomhole Pressure — p<sub>wf</sub>

The pressure at the wellbore while the well is producing.

### Bubble-Point Pressure — p<sub>b</sub>

The pressure at which gas begins to evolve from solution in the oil.

For a composite oil IPR:

* **$p_{\text{wf}} \ge p_b$**: Linear region (single-phase flow above bubble point)
* **$p_{\text{wf}} < p_b$**: Vogel non-linear region (two-phase flow below bubble point)

## 4. Productivity Index — J\*

The basic productivity-index relationship is:

$$ J=\frac{q}{p_r-p_{wf}} $$

The application calculates J\* from radial-flow equations using one of three methods:

1. Transient flow
2. Steady-state flow
3. Pseudosteady-state flow

## 5. Transient Flow

$$ J^*=
\frac{kh}
{162.6B\mu
\left[
\log_{10}(t)+
\log_{10}\left(
\frac{k}{\phi\mu c_t r_w^2}
\right)-3.23
\right]} $$


### Required Inputs

| Parameter | Description | Unit |
|---|---|---|
| k | Permeability | mD |
| h | Reservoir thickness | ft |
| B | Formation volume factor | RB/STB |
| μ | Viscosity | cP |
| t | Flow time | hr |
| φ | Porosity | fraction |
| c<sub>t</sub> | Total compressibility | psi⁻¹ |
| r<sub>w</sub> | Wellbore radius | inch |

**Implementation:** transient flow uses base-10 logarithms. In Java use `Math.log10(x)`.

## 6. Steady-State Flow


$$ J^*=
\frac{kh}
{141.2B\mu
\left[
\ln\left(\frac{r_e}{r_w}\right)+S
\right]} $$


### Required Inputs

| Parameter | Description | Unit |
|---|---|---|
| k | Permeability | mD |
| h | Reservoir thickness | ft |
| B | Formation volume factor | RB/STB |
| μ | Viscosity | cP |
| r<sub>e</sub> | Drainage radius | inch |
| r<sub>w</sub> | Wellbore radius | inch |
| S | Skin factor | dimensionless |

**Implementation:** steady-state flow uses the natural logarithm. In Java use `Math.log(x)`.

## 7. Pseudosteady-State Flow


$$ J^*= \frac{kh}
{141.2B\mu
\left[ \ln\left(\frac{r_e}{r_w}\right)-\frac{3}{4}+S
\right]}$$

The required inputs are the same as steady-state flow.

## 8. Skin Factor

- **S > 0:** additional near-wellbore resistance; generally reduces productivity.
- **S = 0:** no additional skin effect.
- **S < 0:** improved near-wellbore flow; stimulation can produce effective negative skin.

## 9. Composite Linear + Vogel IPR

When \(p<sub>r</sub> > p<sub>b</sub>\), the application can generate a composite IPR.

### Step 1 — Calculate bubble-point rate

\[
q<sub>b</sub>=J * (p<sub>r</sub> - p<sub>b</sub>)
\]

### Step 2 — Calculate theoretical maximum rate

$$ q_{\text{max}} = \frac{1}{q_b} \left( 1 - 0.2 \left( \frac{p_b}{p_r} \right) - 0.8 \left( \frac{p_b}{p_r} \right)^2 \right) $$


### Step 3 — Generate IPR Points

For $p_{\text{wf}} \ge p_b$ (Single-Phase Linear Region):

$$ q = J^* (p_r - p_{\text{wf}}) $$

For $p_{\text{wf}} < p_b$ (Two-Phase Vogel Region):

$$ q = q_b + \frac{J^* p_b}{1.8} \left[ 1 - 0.2 \left( \frac{p_{\text{wf}}}{p_b} \right) - 0.8 \left( \frac{p_{\text{wf}}}{p_b} \right)^2 \right] $$

Where:
* $q_b = J^* (p_r - p_b)$
* Maximum theoretical flow rate at $p_{\text{wf}} = 0$ is $q_{\text{max}} = q_b + \frac{J^* p_b}{1.8}$

## 10. Recommended IPR Chart

The professional output should contain:

### Identification

- Well Name
- Field
- Reservoir / Zone
- Prepared By
- Date & Time
- Revision
- Calculation ID

### Calculation Results

- IPR Method
- J<sup>*</sup> Calculation Method
- Reservoir Pressure, p<sub>r</sub>
- Bubble-Point Pressure, p<sub>b</sub>
- Productivity Index, J<sup>*</sup>
- Bubble-Point Rate, q<sub>b</sub>
- Theoretical Maximum Rate, q<sub>max</sub>

### Graph

- X-axis: **Flowing Bottomhole Pressure, p<sub>wf</sub> (psi)**
- Y-axis: **Production Rate, q (STB/day)**
- Bubble-point marker
- Reservoir-pressure endpoint
- q<sub>b</sub> marker
- q<sub>max</sub> marker
- Linear and Vogel regions in the legend

Do not place excessive administrative information inside the plotting area. Keep identification in a header, calculated values in a results block, the engineering relationship in the graph, and notes/revision information in a footer.

## 11. Input Validation

Recommended checks:

| Parameter | Validation |
|---|---|
| k | > 0 |
| h | > 0 |
| B<sub>o</sub> | > 0 |
| μ | > 0 |
| t | > 0 for transient |
| φ | 0 < φ < 1 |
| c<sub>t</sub> | > 0 |
| r<sub>w</sub> | > 0 |
| r<sub>e</sub> | > r_w |
| p<sub>e</sub> | > 0 |
| p<sub>b</sub> | 0 < p<sub>b</sub> < p<sub>b</sub> for composite Vogel IPR |
| Log arguments | Must be positive |

The application should prevent division by zero and invalid logarithmic arguments.

## 12. Unit Consistency

The formulas use specified field units. The UI should display units beside every input.

Recommended units:

- Permeability: mD
- Thickness: ft
- Oil Formation volume factor: RB/STB
- Viscosity: cP
- Time: hr
- Porosity: fraction
- Compressibility: psi<sup>-1</sup>
- Wellbore radius: inch
- Drainage radius: inch
- Pressure: psi
- Rate: STB/day
- Skin: dimensionless

If radius is entered in feet but the selected equation requires inches:

\[
r<sub>w</sub> (inches)=12 r<sub>w</sub> (feet)
\]

Both \(r<sub>e</sub>\) and \(r<sub>w</sub>\) must use the same unit in the logarithmic ratio.
