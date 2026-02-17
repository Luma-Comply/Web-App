---
title: "FHIR APIs and Prior Authorization: How Interoperability Changes the Game"
excerpt: "The CMS interoperability mandate requires FHIR-based PA APIs. Here's what that means for how you submit and track prior authorizations."
coverImage: "/assets/blog/fhir-apis-prior-authorization-interoperability/cover.svg"
date: "2026-04-13"
author:
  name: "Luma Team"
  picture: "/assets/blog/authors/luma-team.svg"
category: "Industry Insights"
ogImage:
  url: "/assets/blog/fhir-apis-prior-authorization-interoperability/cover.svg"
---

<article>

# FHIR APIs and Prior Authorization: How Interoperability Changes the Game

Most prior authorization problems are information problems.

Clinical data exists inside an EHR. Payer requirements exist inside a coverage policy. The documentation sitting between those two systems — the thing that actually gets a drug approved — is assembled by hand, submitted by fax, and tracked by phone. FHIR changes the plumbing. Not immediately, not perfectly, but meaningfully.

Here's what's actually happening, and what it means for your practice.

## What FHIR Is, Without the Jargon

FHIR stands for Fast Healthcare Interoperability Resources. It's a standard developed by <a href="https://www.hl7.org/fhir/" target="_blank" rel="noopener">HL7 International</a> that defines how healthcare data should be structured and exchanged over the web.

Think of it as a common language that different systems — EHRs, payer portals, clearinghouses — can use to talk to each other. Before FHIR, interoperability meant translating between proprietary formats, often through costly middleware. FHIR uses REST APIs and JSON, the same technology stack behind most modern software. That matters because it lowers the barrier to integration significantly.

For prior authorization specifically, FHIR enables something that wasn't previously possible at scale: structured, real-time data exchange between a provider's clinical system and a payer's adjudication system.

## The CMS Mandate That's Driving This

The <a href="https://www.cms.gov/regulations-and-guidance/regulations/interoperability-prior-authorization" target="_blank" rel="noopener">CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F)</a> requires Medicare Advantage organizations, Medicaid managed care plans, CHIP, and state Medicaid agencies to implement FHIR-based PA APIs by January 1, 2027.

What specifically they have to build:

- A **Patient Access API** — so patients can access their own PA data
- A **Provider Access API** — so treating providers can query payer data on behalf of patients
- A **Payer-to-Payer API** — to exchange PA history when patients switch plans
- A **Prior Authorization API** — to accept and respond to PA requests electronically

That last one is the most operationally significant for your practice. When it's live, you'll be able to submit a PA request from inside your EHR and get a real-time response — or at minimum, a structured acknowledgment — without touching a fax machine or a payer web portal.

The mandate covers federal programs. Commercial payers aren't legally required to comply, but many are building compatible infrastructure anyway because the underlying technology is the same and major health systems are pushing for it.

## The Da Vinci Project: Where the Real Work Is Happening

CMS sets the requirements. <a href="https://www.hl7.org/about/davinci/" target="_blank" rel="noopener">The Da Vinci Project</a> is where the implementation guides actually get built.

Da Vinci is an industry collaborative — payers, EHR vendors, providers — working together to create FHIR implementation guides for high-value use cases. Their Coverage Requirements Discovery (CRD) and Documentation Templates and Rules (DTR) guides are the technical specifications that tell EHR vendors exactly how to query payer systems for PA requirements and pull the right data into PA forms automatically.

The practical effect: when DTR is fully implemented, a physician ordering a biologic shouldn't have to manually look up what documentation a payer requires. The EHR queries the payer in real time, retrieves the PA questionnaire, and pre-populates it with clinical data already in the chart. The physician reviews and submits.

That's the end state. Current adoption is partial — some EHR-payer pairs are live with this today, many are not. But the direction is clear.

## What Changes for Providers

Let's be specific about what actually improves when FHIR-based PA goes live.

**Submission becomes structured.** Instead of attaching a PDF of clinical notes and hoping the reviewer finds the relevant lab values, you're sending discrete data fields — diagnosis codes, lab results, prior treatment history — in a format the payer's system can process directly. Automated review can happen at machine speed for straightforward cases.

**Status tracking becomes real-time.** Right now, checking PA status usually means calling a payer hotline or logging into a portal. With FHIR APIs, your EHR can query status directly and surface it in your workflow. Denials and requests for additional information arrive as structured messages, not faxes.

**Documentation requirements become queryable.** CRD allows an EHR to ask a payer — before submission — exactly what documentation is needed for a specific drug and patient situation. That means fewer denials caused by submitting the wrong documentation, because you can find out what's required before you start.

**Appeals and escalations get a cleaner paper trail.** Structured submission means structured records. If a case goes to peer-to-peer review or appeal, the documentation is organized and accessible.

## Where Things Stand in 2026

Honest assessment: implementation is ahead of schedule in some areas and behind in others.

Pharmacy benefit FHIR APIs are more mature than medical benefit APIs. Specialty and biologic PA — which involves the most complex documentation requirements — lags because the clinical data elements don't map cleanly to standard FHIR resources. A PA for a TNF inhibitor involves step therapy documentation, lab values, disease activity scores, and specialist attestations. That's harder to structure than a standard drug PA.

Epic, Oracle Health (Cerner), and a handful of other large EHR vendors have live implementations with major payers. Smaller EHR vendors are in varying stages. Payer readiness varies even more — some large commercial payers have invested heavily; regional plans are behind.

The mandate deadline of January 2027 will accelerate adoption for federal programs. But full market saturation across all payer types and EHR combinations will take several more years.

## What This Means for Your Documentation Workflow

Here's the opinion worth stating plainly: FHIR interoperability solves the transmission problem, not the documentation quality problem.

When a PA is submitted electronically via FHIR, it still gets denied if the clinical documentation doesn't meet payer criteria. Faster transmission of incomplete documentation is just faster denial. The real-time nature of FHIR actually shortens the window to catch errors before a denial lands.

Practices that use this transition to fix their documentation workflows will see the benefits. Those that assume the technology handles the hard part will be disappointed.

Platforms like <a href="https://useluma.io/blog" target="_blank" rel="noopener">Luma</a> are designed with this in mind — ensuring documentation addresses payer-specific criteria before it hits any electronic channel. FHIR makes submission faster; complete documentation is what gets authorizations approved.

## The Timeline Worth Tracking

**Now**: FHIR PA APIs live between some EHR-payer pairs for pharmacy benefits. Medical benefits emerging.

**Mid-2026**: Large EHR vendors completing FHIR PA integrations with major MA plans ahead of the mandate deadline.

**January 2027**: CMS-covered plans required to have FHIR Prior Authorization APIs live.

**2027-2029**: Commercial payer adoption accelerates. Da Vinci implementation guides for biologics and specialty drugs mature. Automation of complex PA documentation requirements becomes more feasible.

The practices that understand what FHIR actually does — and what it doesn't — will be positioned to use it effectively. The ones waiting for it to "just work" automatically will be waiting a long time.

---

<p style="font-size: 9px; color: #888; margin-top: 2rem;">
<strong>Sources:</strong><br>
Centers for Medicare &amp; Medicaid Services. (2024). <em>CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F).</em> <a href="https://www.cms.gov/regulations-and-guidance/regulations/interoperability-prior-authorization" target="_blank" rel="noopener">cms.gov</a><br>
HL7 International. (2025). <em>FHIR R4 Specification.</em> <a href="https://www.hl7.org/fhir/" target="_blank" rel="noopener">hl7.org</a><br>
HL7 Da Vinci Project. (2025). <em>Da Vinci Use Cases: Coverage Requirements Discovery and Documentation Templates.</em> <a href="https://www.hl7.org/about/davinci/" target="_blank" rel="noopener">hl7.org/about/davinci</a><br>
ONC. (2025). <em>21st Century Cures Act: Interoperability, Information Blocking, and the ONC Health IT Certification Program.</em> <a href="https://www.healthit.gov/topic/oncs-cures-act-final-rule" target="_blank" rel="noopener">healthit.gov</a><br>
American Medical Association. (2025). <em>AMA Prior Authorization Reform: FHIR and Interoperability.</em> <a href="https://www.ama-assn.org/practice-management/prior-authorization/prior-authorization-reform" target="_blank" rel="noopener">ama-assn.org</a>
</p>

</article>
