# Running Race Time Predictor — Implementation Skill

## When to use this skill
Trigger when the user wants to:
- Predict half marathon (21.1 km) or marathon time from shorter race records (5K, 10K)
- Implement a race time calculator or running pace predictor in any app
- Build training pace zones based on race performance
- Work with Riegel, VDOT, Cameron, or any empirical running prediction model

---

## Scientific Background & Key Literature

| Paper | Key contribution |
|---|---|
| Riegel, P.S. *American Scientist* 1981;69(3):285-290. PubMed: 7235349 | Original power law formula (k=1.06) |
| Vickers & Vertosick. *BMC Sports Sci Med Rehabil* 2016;8:26. DOI: 10.1186/s13102-016-0052-y *(open access)* | Personal fatigue exponent from 2 races; Riegel fails at marathon |
| Daniels, J. *Daniels' Running Formula*, 3rd ed. Human Kinetics, 2014 | VDOT system; training paces from race performance |
| Lerebourg et al. *Int J Sports Med* 2023;44(5):352-360. DOI: 10.1055/a-1993-2371 | KNN ML approach; 2.4% MAE marathon-from-10K |
| Dave Cameron formula | Distance-specific fatigue curve; best fit for 5K-HM range; not peer-reviewed but widely validated |

---

## The Three Core Methods

### Method A — Dave Cameron Formula *(recommended primary for 5K->HM)*

Best empirical fit for distances up to half marathon. Uses a distance-specific fatigue function instead of a constant exponent.

```
T2 = T1 x (D2 / D1) x (f(D1) / f(D2))

f(x) = 13.49681 - 0.000030363 x x + 835.7114 / (x ^ 0.7905)

where:
  x   = distance in meters
  T1  = known race time in seconds
  T2  = predicted race time in seconds
  D1  = known race distance in meters
  D2  = target race distance in meters
```

**Accuracy:** ~85% for half marathon from 5K/10K inputs.

---

### Method B — Riegel Power Law *(simple fallback)*

```
T2 = T1 x (D2 / D1) ^ k

Recommended k values:
  k = 1.06   recreational runners (default)
  k = 1.07   mixed/general population (Vickers & Vertosick)
  k = 1.08   elite runners
```

**Accuracy:** ~80% for half marathon. Well-calibrated up to HM (p=0.3). Fails for marathon (underestimates by 10+ min for 50% of runners).

---

### Method C — Personal Exponent from Two Races *(best accuracy when both 5K and 10K available)*

Derived from Vickers & Vertosick (2016). Instead of assuming k=1.06, solve for the runner's personal fatigue exponent from their two known race times.

```
Step 1 - Solve for personal k:
  k = log(T2 / T1) / log(D2 / D1)

  where T1/D1 = shorter race (e.g. 5K), T2/D2 = longer race (e.g. 10K)

Step 2 - Predict target:
  T_target = T1 x (D_target / D1) ^ k

Typical range for recreational runners: k = 1.03-1.15
If k < 1.02 or k > 1.20: flag as outlier (likely one result was a bad race day)
```

**Accuracy:** ~45% lower MSE vs. standard Riegel for marathon.

---

### Method D — Jack Daniels VDOT *(use when training paces are also needed)*

**Step 1 - VO2 demand at race velocity:**
```
v = D / T   (meters per minute, where T is in minutes)
VO2 = -4.60 + 0.182258 x v + 0.000104 x v^2
```

**Step 2 - Fraction of VO2max sustained during race:**
```
t = race duration in minutes
pct = 0.8 + 0.1894393 x e^(-0.012778 x t) + 0.2989558 x e^(-0.1932605 x t)
```

**Step 3 - Calculate VDOT:**
```
VDOT = VO2 / pct
```

**Step 4 - Predict target race:** Solve backwards using numeric solver (bisection). Or use lookup table.

**Reference VDOT -> Half Marathon times:**
```
VDOT 35 -> 1:52:48
VDOT 40 -> 1:40:07
VDOT 45 -> 1:30:09
VDOT 50 -> 1:22:39
VDOT 55 -> 1:16:25
VDOT 60 -> 1:11:20
VDOT 65 -> 1:07:06
VDOT 70 -> 1:03:29
```

**Training paces from VDOT:**
```
Easy (E):       59-74% of vVO2max
Marathon (M):   ~80% of vVO2max
Threshold (T):  ~88% of vVO2max
Interval (I):   97-100% of vVO2max
Repetition (R): 105-115% of vVO2max
```

---

## Decision Logic

```
IF user has both 5K AND 10K times:
    -> Use Method C (personal exponent) as primary
    -> Also show Method A as cross-check
    -> Flag if the two methods differ by > 3 min

ELSE IF user has only one race time:
    -> Use Method A (Cameron) as primary
    -> Use Method B (Riegel k=1.06) as secondary check

IF user also wants training paces:
    -> Add Method D (VDOT) calculation alongside
```

---

## Standard Race Distances (meters)

```
5K            = 5,000
10K           = 10,000
15K           = 15,000
Half marathon = 21,097
Marathon      = 42,195
```

---

## Confidence & Output Guidelines

- Always output a **range**, not just a point estimate
- Conservative estimate: predicted x 1.03
- Optimistic estimate: predicted x 0.98
- If k > 1.12: runner fades significantly at longer distances — flag this
- Riegel is NOT reliable for marathon — always warn the user
- ML approaches (Lerebourg 2023) outperform formulas for marathon but require BMI + age + sex

---

## Implementation Notes

1. Work in **meters and seconds** internally. Convert to mm:ss only for display.
2. Cameron's f(x): note x^0.7905 — use Math.pow(x, 0.7905) or x ** 0.7905
3. VDOT prediction requires a numeric solver (bisection) or pre-computed lookup table.
4. Personal k: use Math.log() — any consistent log base works since it cancels.
5. Edge cases:
   - Input time zero or negative -> reject
   - D1 == D2 -> return T1 unchanged
   - k outside [1.00, 1.25] -> warn user
   - Predicting marathon from only a 5K -> warn about reduced accuracy

---

## Example Test Values

| Input | Cameron | Riegel (k=1.06) | Personal k |
|---|---|---|---|
| 5K: 22:00 | HM: ~1:44:xx | HM: ~1:42:xx | - |
| 10K: 45:30 | HM: ~1:36:xx | HM: ~1:34:xx | - |
| 5K: 22:00 + 10K: 45:30 | - | - | k~1.05, HM: ~1:38:xx |
| 5K: 20:00 | HM: ~1:34:xx | HM: ~1:32:xx | - |
