# Tycoon Feature Priorities

## Goal

Build a version of Tycoon that can wow an audience within 5 minutes and still feel playable end-to-end, even if it is not yet production-grade.

The core demo should prove this value prop:

> Turn operational uncertainty into investment conviction.

That means the product should not feel like a generic manufacturing sim. It should feel like a decision lab where an executive can:

1. See a real disruption.
2. Change assumptions.
3. Test interventions.
4. Compare strategies.
5. Ask a natural-language question.
6. Leave with a credible recommendation.

## Interaction Philosophy

- The simulation needs to travel. Someone should be able to turn the laptop around and have the story still make sense immediately.
- The most important scenario state should live in visible UI, not only in chat.
- Natural language should be the fast executive interface layered on top of the scenario, not the only way to understand the scenario.
- Light gamification is valuable when it makes the system more legible and engaging, not when it turns the product into a toy.

## What the 5-Minute Demo Should Look Like

### Minute 1: Establish the incident

- Open on a live disruption scenario such as Dallas being down.
- Show the network impact immediately in the map, KPI strip, and alerts.
- Make it obvious what is broken and why it matters financially.

### Minute 2: Change assumptions

- Open an assumption builder.
- Change outage duration, labor availability, supplier lead time, or freight mode.
- Show that the scenario state updates clearly and that changes are tracked from baseline.

### Minute 3: Build a response plan

- Open an intervention builder.
- Add 2-3 actions such as reroute volume, add overtime, and expedite freight.
- Show execution cost and projected KPI impact after each action.

### Minute 4: Compare strategies

- Compare baseline, manual response, and AI-optimized response side by side.
- Highlight the best strategy for the selected objective such as margin, service level, or recovery time.

### Minute 5: Ask the executive question

- Ask: "What happens to Q3 margin if Dallas is down 30 more days?"
- Return a structured answer with summary, recommended actions, impact, assumptions, and confidence.
- End on a concise "decision-ready" recommendation.

## Priority Ranking

### P0: Must-have for the wow demo

#### 1. Scenario comparison view

Why it matters:
This is the clearest way to prove control vs experiment, which is central to Tycoon's credibility.

Requirements:

- Compare at least three modes: baseline / do nothing, manual response, AI-optimized response.
- Display KPI deltas side by side.
- Highlight best-performing strategy under the chosen objective.
- Show confidence level or range for each strategy.

Demo value:
This is the moment where the audience stops seeing a dashboard and starts seeing a decision product.

#### 2. Assumption builder

Why it matters:
Executives need to trust that the scenario is grounded in explicit business assumptions, not hidden demo logic.

Requirements:

- Allow editing of outage duration, spare capacity, labor availability, freight mode, supplier lead time, service-level priority, and SKU prioritization.
- Show active assumptions clearly on-screen.
- Track changes from baseline.
- Persist assumptions per scenario version.

Demo value:
This makes the model feel transparent and credible.

#### 3. Intervention builder

Why it matters:
The product needs to move from "something bad happened" to "here is what we can do about it."

Requirements:

- Allow users to toggle interventions such as reroute volume, add overtime, expedite freight, prioritize SKUs, open overflow capacity, and shift labor.
- Estimate cost to execute each intervention.
- Show projected KPI impact after each change.
- Allow bundling multiple interventions into one action plan.

Demo value:
This is where the sim becomes a decision lab.

#### 4. Executive decision console

Why it matters:
Natural language is the fastest executive interface in the room, but it only works if the output is structured and scenario-aware.

Requirements:

- Accept prompts such as "What happens to Q3 margin if Dallas is down 30 more days?"
- Return structured answers with summary, recommended actions, estimated impact, assumptions, and confidence.
- Suggest follow-up questions.
- Maintain context within a scenario session.

Demo value:
This is the highest-visibility feature in the room, but it only lands if the scenario engine underneath it is real enough.

### P1: Strongly recommended next

#### 5. Scenario versioning

Why it matters:
Assumptions, interventions, and comparison all get easier if each scenario branch is a first-class object.

Recommended scope:

- Create scenario versions from a baseline.
- Preserve assumptions and intervention bundles per version.
- Allow quick switching between versions.

#### 6. Objective selector

Why it matters:
Executives optimize for different outcomes. The app should support "best margin," "best service level," or "fastest recovery."

Recommended scope:

- Add an explicit objective selector.
- Re-rank strategies in comparison view based on the chosen objective.

#### 7. Board-ready export

Why it matters:
The demo should leave behind a decision artifact, not just a memory.

Recommended scope:

- Export a concise ROI memo.
- Include assumptions, actions, KPI deltas, confidence, and a recommended plan.

### P2: Nice-to-have after the demo works

#### 8. Deeper line-item plant controls

- Production mix tuning
- More granular labor shifts
- Supplier substitutions
- Inventory buffer policies

#### 9. Better explanation and lineage UI

- Why a KPI changed
- Which assumption drove the delta
- Which intervention contributed most to outcome

#### 10. More realistic event chains

- Upstream/downstream propagation
- Recovery delays
- Secondary bottlenecks

## Recommended Build Order

1. Introduce a scenario model with baseline, assumptions, interventions, and computed outcomes.
2. Build the assumption builder UI on top of that model.
3. Build the intervention builder UI and KPI recomputation.
4. Build the comparison view.
5. Upgrade the executive console to read from scenario state and comparison outputs.
6. Add export only after the above flow feels coherent.

## What To Avoid Right Now

- Do not spend the next cycle adding more decorative widgets.
- Do not build more hardcoded chat responses.
- Do not make assumptions, interventions, and comparison each own separate calculation logic.
- Do not bury key scenario state inside component-local state.

## Success Criteria

We should be able to run a demo where the audience can say:

- "I understand the incident."
- "I can see which assumptions are driving the answer."
- "I can test my own response plan."
- "I can compare human vs AI strategy."
- "I can ask a business question and get a structured answer."
- "I would trust this enough to discuss an investment decision."

## Execution Roadmap

This section is the living implementation plan. It should be updated as work lands so the file stays useful as the single persistent brief for the project.

Status legend:

- `[x]` completed
- `[~]` in progress
- `[ ]` not started

### Phase 0: Foundations and Dependency Hygiene

Goal:
Get the app installing, building, and ready for iterative work.

Status:

- `[x]` Fix dependency install/build issues on current Node setup.
- `[x]` Align React versioning with `react-simple-maps`.
- `[x]` Restore a clean `npm install` and successful `npm run build`.

Acceptance criteria:

- The app installs without peer-dependency hacks.
- The app builds locally.
- The repo is in a stable enough state to begin functional work.

Suggested commit checkpoint:

- `chore: stabilize install and build on node 24`

### Phase 1: Scenario Engine and Shared State

Goal:
Move core demo logic into a reusable scenario model so assumptions, interventions, comparison, and chat all read from the same source of truth.

Status:

- `[x]` Introduce base scenario types and outcome computation helpers.
- `[x]` Add shared state for assumptions, selected interventions, active strategy, and objective.
- `[x]` Generate baseline, manual, and AI scenario variants from common state.
- `[~]` Continue replacing remaining hardcoded UI reads with scenario-derived values.

Acceptance criteria:

- One scenario change propagates through all relevant views.
- Comparison and executive answers are computed from the same scenario data.
- New features can plug into the scenario model without inventing separate local logic.

Suggested commit checkpoints:

- `feat: add shared scenario engine`
- `feat: wire scenario state into executive controls`

### Phase 2: Five-Minute Demo Core Loop

Goal:
Make the demo playable end-to-end in a way that is legible when the laptop is turned around.

Status:

- `[x]` Build visible assumptions UI.
- `[x]` Build visible intervention selection UI.
- `[x]` Build baseline/manual/AI comparison UI.
- `[x]` Make the executive console answer from live scenario state.
- `[x]` Push the scenario state into the center-stage visuals so the whole room sees the change.

Acceptance criteria:

- A user can change assumptions.
- A user can build a response plan.
- A user can compare three strategies.
- A user can ask a question and get a structured answer grounded in the scenario.
- The main screen, not just the side rail, visibly reacts to the chosen strategy.

Suggested commit checkpoints:

- `feat: add assumption and intervention controls`
- `feat: add scenario comparison and live executive answers`
- `feat: reflect selected strategy in main simulation surfaces`

### Phase 3: Main-Screen Simulation Legibility

Goal:
Upgrade the visible simulation surfaces so the product message travels instantly.

Status:

- `[x]` Replace hardcoded top-bar narrative metrics with scenario-derived numbers.
- `[ ]` Replace static outage and recovery banners with scenario-aware messaging.
- `[x]` Make the map, network throughput, and KPI summaries reflect active assumptions and strategy.
- `[ ]` Make the center panel tell a clearer before/after story without requiring chat.

Acceptance criteria:

- The main screen communicates the scenario in under 10 seconds.
- Strategy shifts are visible in map and top-level metrics.
- An observer can understand the story without touching any controls.

Suggested commit checkpoints:

- `feat: make main map and top bar scenario-aware`
- `feat: improve center-stage strategy storytelling`

### Phase 4: Versioning and Plan Packaging

Goal:
Make strategy exploration feel deliberate and reusable rather than ephemeral.

Status:

- `[ ]` Support first-class scenario versions.
- `[ ]` Persist assumptions per scenario version.
- `[ ]` Persist intervention bundles as named plans.
- `[ ]` Support quick switching between saved strategy states.

Acceptance criteria:

- Manual and AI plans can be revisited without re-entering everything.
- The product clearly distinguishes baseline from branches.
- A scenario session feels like a decision workspace, not a one-off toy.

Suggested commit checkpoints:

- `feat: add scenario versioning`
- `feat: support named intervention plans`

### Phase 5: Board-Ready Outputs and Trust Layer

Goal:
Strengthen credibility by making the outputs easier to explain, share, and defend.

Status:

- `[ ]` Add explanation of what changed each KPI.
- `[ ]` Add simple assumption lineage and rationale for recommendations.
- `[ ]` Add confidence framing in a more deliberate, visible way.
- `[ ]` Export a concise ROI memo or executive summary artifact.

Acceptance criteria:

- The app can answer "why this recommendation?"
- The audience can see assumptions and tradeoffs clearly.
- The session leaves behind a decision artifact.

Suggested commit checkpoints:

- `feat: add explanation and confidence layer`
- `feat: export executive roi summary`

## Near-Term Working Sequence

This is the intended order for the next implementation passes:

1. Finish pushing scenario-derived state into the center-stage visuals.
2. Remove the highest-value remaining hardcoded metrics and banners.
3. Make the selected strategy visibly influence the network map and top-level summary.
4. Add lightweight scenario versioning so we can preserve baseline/manual/AI and branch from them cleanly.
5. Tighten the executive console output formatting and follow-up behavior.
6. Add export and trust-layer features only after the main five-minute loop feels crisp.

## Working Principles While Implementing

- Prefer one clean scenario model over multiple clever UI-local hacks.
- Keep the visible simulation surfaces authoritative enough that chat feels like an accelerator, not a crutch.
- Make fast demo clarity more important than deep realism until the 5-minute story is excellent.
- Commit at the end of each meaningful vertical slice, not just after tiny edits.
- Update this file whenever a phase meaningfully advances so progress is visible in-repo.
