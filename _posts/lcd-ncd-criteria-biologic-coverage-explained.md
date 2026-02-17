---
title: "Understanding LCD and NCD Criteria for Biologic Coverage"
excerpt: "LCDs and NCDs determine whether a biologic gets covered. Most providers never read them. That's why submissions get denied."
coverImage: "/assets/blog/lcd-ncd-criteria-biologic-coverage-explained/cover.svg"
date: "2026-03-12"
author:
  name: "Luma Team"
  picture: "/assets/blog/authors/luma-team.svg"
category: "Tutorials"
ogImage:
  url: "/assets/blog/lcd-ncd-criteria-biologic-coverage-explained/cover.svg"
---

<article>

<p>Medicare coverage decisions for biologics don't come from a single national rulebook. They come from coverage determinations — policy documents that spell out exactly what conditions must be met before Medicare will pay. Most providers submitting biologic prior authorizations for Medicare patients have never read one. That gap is a significant reason why submissions fail.</p>

<p>Understanding LCDs and NCDs isn't an academic exercise. It's the difference between writing documentation that maps to what the reviewer is checking, versus writing documentation that makes a perfectly good clinical case against criteria you've never seen.</p>

---

<h2>LCDs vs. NCDs: The Core Difference</h2>

<p>A National Coverage Determination (NCD) is set by CMS at the federal level and applies uniformly across all Medicare jurisdictions. NCDs are relatively rare — there are around 300 total — and tend to cover well-established treatments with strong national evidence consensus.</p>

<p>A Local Coverage Determination (LCD) is set by a Medicare Administrative Contractor (MAC) at the regional level. There are seven MACs covering different geographic jurisdictions, and each can issue its own LCDs for services and drugs within their region. For biologics specifically, LCDs are far more common than NCDs, and they're the primary coverage framework you'll encounter for most biologic PA submissions.</p>

<p>This geographic variation is intentional — it allows local medical review contractors to establish coverage criteria that reflect regional prescribing patterns, clinical norms, and utilization data. The practical consequence for practices is that the LCD governing infliximab coverage under Novitas (which covers the Mid-Atlantic and Southwest) may differ in meaningful ways from the LCD under WPS (which covers the Midwest and Pacific Northwest).</p>

---

<h2>How to Find the Relevant LCD or NCD</h2>

<p>The authoritative source is the <a href="https://www.cms.gov/medicare-coverage-database/search.aspx" target="_blank" rel="noopener">CMS Medicare Coverage Database (MCD)</a>. It's publicly available and searchable by keyword, HCPCS code, or contractor. Most providers who've heard of it haven't actually used it — it's less intuitive than it should be, but it contains everything.</p>

<p>The practical search approach:</p>

<ol>
  <li>Go to the MCD search page and select "LCD" from the document type filter</li>
  <li>Enter the drug name or the HCPCS J-code (J0135 for adalimumab, J1745 for infliximab, etc.)</li>
  <li>Filter by your MAC jurisdiction — you'll find this on your MAC's website or on the CMS MAC assignment map</li>
  <li>Look for the active LCD (status = "Final") for your indication</li>
</ol>

<p>Some biologics don't have specific LCDs — in those cases, coverage is determined by the contractor's general coverage policies and the Part B drug benefit rules. If you search and find no LCD, check the NCD database. If neither exists, the decision rests on the contractor's medical review process, which means your clinical documentation is carrying more weight without a specific policy framework to anchor to.</p>

---

<h2>How to Read an LCD: What Each Section Means</h2>

<p>LCDs follow a standard structure. Once you've read one carefully, the rest become easier to navigate quickly. Here's what each section contains and what to look for.</p>

<h3>Coverage Indications, Limitations, and/or Medical Necessity</h3>
<p>This is the core of the document. It defines the clinical criteria that must be met for Medicare to consider a service covered. For biologics, this section will list specific diagnoses, required prior treatments, disease severity thresholds, and any diagnostic confirmation requirements (like positive RF or anti-CCP for seropositive RA).</p>

<p>Read every criterion listed here as a checklist. Each item is something your documentation must address explicitly. If the LCD says "moderate-to-severe RA as defined by DAS28 greater than 3.2," your submission needs a documented DAS28 score — not just a clinical impression of moderate disease.</p>

<h3>ICD-10 Coding</h3>
<p>This section lists the specific diagnosis codes the contractor accepts for coverage. This is not advisory — these are the codes your claim must carry. Submitting with a code not on this list, even a clinically accurate one, can result in an automatic denial before a human reviewer sees the case.</p>

<p>This is where the M06.9 (RA unspecified) problem we covered in previous posts becomes a coverage issue, not just a coding preference. If the LCD lists M05.xx codes for seropositive RA, submitting M06.9 for a seropositive patient is a preventable error with predictable consequences.</p>

<h3>Documentation Requirements</h3>
<p>Many LCDs include a specific documentation section listing what must be in the medical record to support a claim. For biologics, this typically includes: the qualifying diagnosis with confirming objective data, the step therapy history with specific drugs and duration, and a clinical assessment of disease activity at the time of the biologic request.</p>

<p>Some LCDs reference specific forms or structured documentation requirements. Check this section carefully — missing a required element that's explicitly listed is a straightforward denial that shouldn't happen.</p>

<h3>Utilization Guidelines</h3>
<p>This section covers things like frequency limits, dose limits, and renewal requirements. For biologics, utilization guidelines often include maximum authorized durations (typically 12 months per authorization) and conditions for renewal — such as documented clinical response at reassessment.</p>

---

<h2>Walking Through a Real Example: Infliximab for Crohn's Disease</h2>

<p>Let's make this concrete. Infliximab (Remicade, J1745) for Crohn's disease is covered under LCDs in most MAC jurisdictions. Here's what a typical LCD for this indication requires, and how it should shape your documentation.</p>

<p><strong>Diagnosis criteria:</strong> The patient must have moderate-to-severe Crohn's disease. "Moderate-to-severe" is typically defined by CDAI score (typically 220-450 for moderate, above 450 for severe, though some LCDs specify Harvey-Bradshaw Index instead). The LCD will specify which scoring tool is acceptable — using a different one creates ambiguity even if the clinical picture is identical.</p>

<p><strong>Prior treatment:</strong> Most infliximab LCDs for Crohn's require documented failure of at least one conventional therapy — typically corticosteroids and at least one immunomodulator (azathioprine, 6-MP, or methotrexate). The LCD will specify minimum duration (usually 3-6 months for immunomodulators) and require documentation of the failure mode — inadequate response, intolerance, or contraindication.</p>

<p><strong>Confirming diagnosis:</strong> Some LCDs require objective confirmation of Crohn's disease — endoscopy, imaging, or biopsy findings — not just a clinical diagnosis. If your submission doesn't include a reference to objective confirmatory findings, it may fail this criterion even when the diagnosis is completely established in the chart.</p>

<p>A submission that addresses all of this explicitly — disease severity score, prior treatment timeline with documented failure, confirming diagnostic data — maps cleanly to what the LCD reviewer is checking. A submission that makes the same clinical case in narrative form without hitting these specific data points fails even though the underlying clinical situation is identical.</p>

---

<h2>Why Generic Documentation Fails Against Specific LCD Criteria</h2>

<p>Most practice PA processes involve some version of a template letter: diagnosis, medications tried, clinical impressions. This works reasonably well for commercial payer submissions, where reviewer discretion plays a larger role. For Medicare LCD-governed submissions, it's a significant liability.</p>

<p>LCD reviewers are auditing your submission against a checklist. Their job is to confirm that each criterion listed in the coverage policy is met by the documentation in front of them. When your letter says "patient has severe Crohn's disease with significant impact on quality of life" but doesn't include a CDAI score, the reviewer sees a criterion unmet — not a clinical case that should be interpreted charitably.</p>

<p>This isn't a reviewer problem. It's a documentation translation problem. The clinical record contains what the reviewer needs. The submission needs to extract it, organize it, and present it in the format the LCD specifies.</p>

<p>My take: the LCD framework is actually more favorable for practices than commercial payer review, once you learn to work with it. The criteria are published and specific. There's no ambiguity about what the reviewer is looking for. The rules are knowable — which means documentation failures are preventable in a way that subjective commercial denials often aren't.</p>

---

<h2>NCDs in the Biologic Space</h2>

<p>National Coverage Determinations for biologics are less common than LCDs, but they do exist for specific indications. One of the more consequential ones is the NCD for Intravenous Immune Globulin (IVIg) for certain autoimmune conditions. The CMS <a href="https://www.cms.gov/medicare-coverage-database/view-ncds.aspx" target="_blank" rel="noopener">NCD database</a> is the authoritative reference.</p>

<p>When an NCD exists for a drug or indication, it supersedes any conflicting LCD. NCDs represent CMS's national position on coverage, and contractors cannot establish local policies that contradict them. For practices operating in multiple MAC jurisdictions, NCDs create uniform coverage rules — which simplifies documentation somewhat compared to navigating different LCD requirements by region.</p>

---

<h2>Staying Current: LCDs Change</h2>

<p>LCDs are not static. MACs revise them as clinical evidence evolves, new drugs receive FDA approval, and prescribing patterns shift. A biosimilar entering the market can trigger an LCD revision. CMS guidance changes can prompt MAC updates. An LCD you read six months ago may have a new version with different criteria.</p>

<p>The CMS Medicare Coverage Database shows the effective date of each LCD and maintains revision history. Before submitting, confirming you're working from the current version takes two minutes and prevents the specific kind of denial that comes from submitting against outdated criteria.</p>

<p>This is exactly the type of real-time research that makes <a href="https://useluma.io/blog">AI-assisted PA documentation</a> valuable. Luma pulls current LCD and NCD criteria at the time of each submission — not cached policy versions from a prior research cycle — so the documentation your team submits is always mapped to the policy the reviewer is actually using.</p>

<p>The <a href="https://www.americanactionforum.org/research/the-cost-of-prior-authorization/" target="_blank" rel="noopener">administrative cost of prior authorization</a> falls hardest on Medicare patients and the practices that serve them. Getting LCD-aligned documentation right the first time is one of the highest-leverage improvements most practices can make to their PA workflows.</p>

---

<p style="font-size: 9px; color: #888; margin-top: 2rem;">
Sources:<br>
1. CMS Medicare Coverage Database — <a href="https://www.cms.gov/medicare-coverage-database" target="_blank" rel="noopener">cms.gov/medicare-coverage-database</a><br>
2. CMS National Coverage Determinations — <a href="https://www.cms.gov/medicare-coverage-database/view-ncds.aspx" target="_blank" rel="noopener">cms.gov</a><br>
3. American Action Forum — The Cost of Prior Authorization — <a href="https://www.americanactionforum.org/research/the-cost-of-prior-authorization/" target="_blank" rel="noopener">americanactionforum.org</a><br>
4. Novitas Solutions — LCD Search Portal — <a href="https://www.novitas-solutions.com/webcenter/portal/MedicareJH/LCDs" target="_blank" rel="noopener">novitas-solutions.com</a><br>
5. Crohn's & Colitis Foundation — Disease Activity Scoring — <a href="https://www.crohnscolitisfoundation.org/resources/measuring-disease-activity" target="_blank" rel="noopener">crohnscolitisfoundation.org</a>
</p>

</article>
