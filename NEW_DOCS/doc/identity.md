# Identity: Thotsakan Statistics (ทศกัณฐ์ สถิติ)

> **"Stop Calculating. Start Simulating."**
>
> Project code: **THOTSAKAN-LAB** — "The 10-Armed Laboratory"

This document is the product law. If a feature does not fit the "10-Armed Lab" identity, we do not build it. Items marked *(vision)* describe where the product is going and are not implemented yet.

## 1. The Core Vision

**Thotsakan Statistics** is not a calculator. It is a web-based **Virtual Statistics Laboratory** for Thai university students.

We reject the idea that statistics is about memorizing formulas. We believe statistics is about **intuition**. Our goal is to transform students from passive "listeners" into active "scientists" who can touch, break, and manipulate data to understand how the world works.

### The "Thotsakan" Metaphor

Just as the giant **Thotsakan** has 10 faces and 20 arms to see and control the world from every angle, our software gives students "10 Arms" (sliders, toggles, selectors) to manipulate the variables of reality and watch the data universe change.

* **We do not give answers.** We give tools.
* **We do not check homework.** We test hypotheses.
* **We do not lecture.** We let students fail safely.

---

## 2. Our Identity: The Sandbox

| **We Are...** | **We Are NOT...** |
| :--- | :--- |
| **A Sandbox** where you break things to learn. | **A Textbook** with a single correct path. |
| **A Simulator** (Monte Carlo, bootstrapping). | **A Calculator** (input X, get Y). |
| **Budget-Based** — you have limited samples *(vision)*. | **Infinite** — real science has costs. |
| **Visual First** — graphs before numbers. | **Formula First** — Greek letters scare people. |
| **Thai-Contextualized** — Lotto, PM2.5, Grab *(vision)*. | **Western-Imported** — baseball stats, dice. |

---

## 3. The User Experience (UX) Pillars

Every screen must feel like a **Lab Bench**, not a quiz. It follows the **"Control → Observe → Log"** loop, which maps one-to-one onto the three LabBench panels:

```text
+---------------------+------------------------------------------+----------------------+
|  PANEL 1: CONTROLS  |         PANEL 2: OBSERVATION DECK        |   PANEL 3: NOTEBOOK  |
|  (Thotsakan's Hands)|            (Thotsakan's Eyes)            |  (Thotsakan's Brain) |
|                     |                                          |                      |
|  [ Slider: Mean   ] |                                          |  [   BIG STATS    ]  |
|  <----O--------->   |           /  ( The Curve ) \             |    Prob: 95.4%       |
|                     |          /                  \            |    Z-Score: 1.96     |
|  [ Slider: StDev  ] |         /                    \           |                      |
|  <-------O------>   |  ______/                      \______    |  ------------------  |
|                     |                                          |  [   THE LESSON   ]  |
|  [ Toggle: Mode   ] |      ( Interactive Plotly Graph )        |  "Notice how the     |
|  ( ) PDF  (x) CDF   |                                          |   tails get thinner  |
|                     |                                          |   as you increase    |
|  [  RESET BUTTON  ] |                                          |   sample size?"      |
+---------------------+------------------------------------------+----------------------+
```

### A. The Control Room (Thotsakan's Hands)

* **The Input:** never just a text box. Every numeric variable has **coarse and fine control**: a slider for exploring behavior and a synced text input for typing exact homework values. Type "5.5" and the slider jumps; drag the slider and the number changes.
* **The Constraint** *(vision)*: the "Budget." Real science costs money.
    * *Example:* "You have 1,000 Baht. Each sample costs 10 Baht. Can you prove the vaccine works before you run out of money?"
* **The Feeling:** tactile, responsive, heavy.

### B. The Observation Deck (Thotsakan's Eyes)

* **The Output:** visualization that keeps up with the student's hand. Sliders feel live: the 12-distributions tab draws a provisional preview instantly, and every chart settles on the authoritative backend result about a quarter-second after the student stops moving.
* **The Rule:** "Show, Don't Tell." Don't show the p-value until the student has seen the rejection region on the graph. (The Hypothesis tab hides the p-value, verdict and raw table until the student asks.)
* **The Tech:** a React single-page app — no page reloads.

### C. The Lab Notebook (Thotsakan's Brain)

* **The Reflection:** we don't grade students. We give them the numbers and an interpretation, and ask them to reflect.
* **The Prompt:** *"You increased the sample size to 10,000. Why did the curve get narrower?"*

---

## 4. The Technical Principles

To support the "Lab" identity, we prioritize **interactivity and correctness** over everything else.

* **Frontend: React + TypeScript + Vite.**
    * *Why:* a full SPA gives instant UI feedback. It renders; it does not compute statistics. The only exception is a clearly labeled provisional preview for distribution sliders.
* **Backend: FastAPI + Python** (scipy, statsmodels, pingouin).
    * *Why:* the engine must be scientifically accurate. Python is the authority — the professor reads and verifies `core/` directly.
* **Visualization: Plotly.**
    * *Why:* interactive hovering, zooming and panning are mandatory. Static images (Matplotlib) are not shown in the Lab.
* **The Pattern:** thin client + authoritative server.
    * *Why:* responsive UI with verifiable math — one source of truth for every number a student sees.

---

## 5. Target Audience & Tone

### Who is this for?

1. **The "Visual Learner" university student:** the student who struggles with Greek notation but understands patterns instantly when they see them.
2. **The "Modern" professor:** the lecturer who wants to project a simulation instead of drawing a bad curve by hand.

### Tone of Voice

* **Scientific but accessible:** we use correct terms (variance, standard deviation) but explain them simply.
* **Challenging:** we don't say "Good job!" We say "Hypothesis confirmed."
* **Thai-native:** we speak to the Thai experience and use data from *our* world.

---

## 6. The "Anti-Features" (What we will NEVER build)

* **Photo-Solver:** we will never build a tool that lets students photograph a homework problem to get the answer. That destroys the Lab.
* **Multiple-Choice Quizzes:** real life is not A, B, C or D. It is a continuous variable.
* **Static Text Walls:** if it takes more than three sentences to explain, build a simulation for it instead.
