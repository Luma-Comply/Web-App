---
title: "How Electronic Health Records Can Improve Documentation Quality"
excerpt: "Your EHR has tools for better documentation hiding in plain sight. Here's how to use them to reduce PA denials."
coverImage: "/assets/blog/electronic-health-records-improve-documentation-quality/cover.svg"
date: "2026-04-17"
author:
  name: "Luma Team"
  picture: "/assets/blog/authors/luma-team.svg"
category: "Tutorials"
ogImage:
  url: "/assets/blog/electronic-health-records-improve-documentation-quality/cover.svg"
---

<article>

# How Electronic Health Records Can Improve Documentation Quality

Here's a frustrating truth about prior authorization denials: most of them aren't caused by patients who don't qualify. They're caused by documentation that doesn't prove the patient qualifies.

The clinical record usually has what the payer needs. It's buried in a narrative note, missing a specific threshold value, or documented in a way that worked for clinical care but doesn't satisfy a medical necessity criterion. The EHR tools that could prevent this exist in most systems already — and most practices aren't using them.

## Structured Fields Beat Free Text Every Time

The single highest-leverage change most practices can make is shifting clinical documentation from free text to structured data fields where possible.

Free text is how physicians think and communicate. It's also nearly impossible for downstream systems — and PA reviewers — to parse reliably. A note that says "patient has tried multiple biologics without adequate response" contains useful clinical information. It doesn't give a payer reviewer — or an automated adjudication system — the specific prior treatment names, durations, doses, and documented failure reasons needed to satisfy step therapy requirements.

Structured EHR fields — discrete data entry for diagnosis codes, lab values, medication history, and treatment responses — create documentation that is queryable, auditable, and usable downstream. When a PA requires "documentation of at least two prior biologic failures with specific agents named," a structured medication history with documented discontinuation reasons answers that question precisely. A free-text summary requires a reviewer to interpret it, which introduces both subjectivity and delay.

The practical implication: work with your EHR team to identify which clinical data elements are most frequently needed for your biologic PAs and ensure there are structured fields capturing them. Disease activity scores (DAS28, BASDAI, PASI, and equivalents by specialty), lab values with dates, and treatment history with outcome documentation are the highest-value targets.

## Smart Phrases and Templates: The Right Way to Use Them

Most EHRs support smart phrases (Epic calls them SmartPhrases; other systems have equivalents) — text macros that populate documentation templates with a keystroke. Used well, they enforce consistency. Used badly, they generate the documentation equivalent of copy-paste malpractice.

The right approach is templates that prompt the clinician to enter specific values rather than auto-populate placeholder text.

A smart phrase that inserts "Patient continues to experience symptoms despite ongoing therapy" adds nothing useful. A smart phrase that inserts "Disease activity score: [ENTER SCORE]. Most recent flare: [ENTER DATE]. Current biologic: [ENTER DRUG NAME], [ENTER DOSE], started [ENTER DATE]" forces the clinician to document the specifics that actually matter.

Build your templates around what payers ask for. Most commercial payers publish their medical necessity criteria for biologics — often in their coverage determination documents or LCD supplements. Cross-reference those criteria against your documentation templates and identify the gaps. If a payer requires a minimum CDAI score for a Crohn's biologic PA, your gastroenterology note template should be capturing CDAI.

## Clinical Decision Support That Actually Triggers

Clinical decision support (CDS) alerts in EHRs are widely hated because they're misconfigured. Alert fatigue is real — when a system fires 40 alerts per patient encounter, clinicians learn to dismiss all of them without reading.

The appropriate use of CDS for PA documentation isn't broad alerts. It's targeted triggers at the specific moments when documentation decisions affect downstream PA outcomes.

**Order-entry alerts** that fire when a biologic is ordered and prompt documentation of disease severity, prior treatments, and relevant labs. Placed at the point of prescribing, these are actionable because the order can't proceed without the information.

**Lab value alerts** that flag when a required lab (CRP, ESR, HbA1c, specific antibody titers) is missing or outside the recency window required by a payer. If your rheumatoid arthritis biologic PAs require a CRP within 90 days and the most recent result is 120 days old, a CDS alert at order entry prevents a preventable denial.

**Diagnosis specificity alerts** when an unspecified ICD-10 code is selected for a diagnosis that has — and requires — greater specificity for biologic coverage. "M06.9: Rheumatoid arthritis, unspecified" is exactly the kind of code that triggers automatic PA denials for biologics that require site-specific or seronegative/seropositive distinction.

The <a href="https://www.cms.gov/Medicare/Coding/ICD10" target="_blank" rel="noopener">CMS ICD-10 coding guidance</a> is explicit about this: unspecified codes are appropriate when clinical information is genuinely unknown. For established biologic patients, the diagnosis is known. Unspecified codes in this context are a documentation failure, not a clinical reality.

## Order Sets With PA Triggers

Order sets are underused for PA workflow. Most practice-built order sets are organized around clinical logic — which labs to order alongside a new biologic, what baseline tests are required. The PA-relevant documentation requirements are usually handled separately, if at all.

Order sets that include PA documentation requirements alongside clinical orders change the sequence. When a physician builds an order set for initiating a TNF inhibitor in a rheumatoid arthritis patient, that order set can include:

- Baseline lab orders (CBC, CMP, TB testing, hepatitis panel)
- A documentation prompt for disease activity score capture
- A prior treatment history update prompt
- A referral note requirement if specialist involvement is needed for the PA

Everything happens at initiation, in one workflow, rather than being assembled after the fact when the PA request is filed. The clinical workflow and the PA documentation workflow align instead of running in parallel and getting out of sync.

## Documentation Habits That Kill PA Approvals

Some EHR behaviors that feel efficient in clinical practice actively undermine PA success.

**Copy-forward without update.** The single most damaging documentation habit. A note that says "Patient doing well, continue current regimen" copied from the prior three visits tells a PA reviewer nothing about current disease activity, current treatment, or whether the clinical picture still supports biologic therapy. Payers reviewing PA requests for continuation of biologic therapy want to see current evidence of disease activity, current labs, and current treatment response — not a chain of identical notes that suggests no one is evaluating the patient.

**Auto-populated templates without clinical specifics.** Templates that auto-insert standard language based on the patient's problem list — without clinician review — produce notes that look complete and aren't. "Patient has rheumatoid arthritis and is on biologic therapy" as an auto-generated statement in a note used to support a PA is essentially useless. The payer already knows this from the claim history.

**Incomplete prior treatment documentation.** Step therapy requirements are the most common cause of biologic PA denials for patients who clinically qualify. If a patient failed methotrexate five years ago before switching practices, that failure needs to be in the current chart — with the drug name, dose, duration, and reason for discontinuation. Verbal history in a clinician's head does not satisfy a prior treatment documentation requirement.

**Unlinked diagnoses and medications.** An EHR problem list that includes a diagnosis but doesn't link it to the medication being prescribed for it creates a documentation gap. PA reviewers need to connect the clinical indication to the drug. That connection should be explicit in the chart, not inferential.

## How Structured EHR Data Enables Better PA Outcomes

The argument for investing in documentation quality through EHR structure isn't abstract. Practices that have systematically improved their structured data capture consistently see measurable PA outcomes improve.

<a href="https://www.ahima.org/topics/health-information-management/documentation-quality/" target="_blank" rel="noopener">AHIMA's documentation quality research</a> consistently shows that complete, specific clinical documentation reduces claim denials by 20-40% depending on specialty and payer mix. For biologics — where denial rates can run 30-50% without strong documentation — the upside of getting this right is substantial.

The mechanism is straightforward: structured EHR data is complete, specific, and queryable. When a PA is filed with discrete lab values, named prior treatments with documented outcomes, and a current disease activity score linked to a specific ICD-10 code, the payer reviewer — human or automated — has everything needed to approve. When it's a narrative note, approval depends on whether the reviewer interprets the narrative the same way the clinician intended.

Platforms like <a href="https://useluma.io/blog" target="_blank" rel="noopener">Luma</a> work with structured EHR data to produce this kind of documentation at scale. The EHR captures discrete clinical data; Luma transforms it into payer-ready medical necessity letters that address specific coverage criteria. The better the structured data going in, the stronger the documentation coming out.

## Where to Start

Don't try to fix everything at once. Pick the biologic with your highest PA denial rate, pull the payer's medical necessity criteria, and audit your current documentation against those criteria for the last 10 denied cases. You'll find a pattern — probably two or three specific documentation elements that were consistently missing or incomplete.

Fix those first: add the structured field if it doesn't exist, build the smart phrase, set the CDS alert. Measure the denial rate for that drug at 90 days. Expand from there.

The EHR already has most of what you need. The question is whether the workflow is configured to produce complete documentation rather than just compliant-looking documentation.

---

<p style="font-size: 9px; color: #888; margin-top: 2rem;">
<strong>Sources:</strong><br>
Centers for Medicare &amp; Medicaid Services. (2025). <em>ICD-10-CM Official Guidelines for Coding and Reporting.</em> <a href="https://www.cms.gov/Medicare/Coding/ICD10" target="_blank" rel="noopener">cms.gov</a><br>
AHIMA. (2025). <em>Clinical Documentation Improvement and Quality.</em> <a href="https://www.ahima.org/topics/health-information-management/documentation-quality/" target="_blank" rel="noopener">ahima.org</a><br>
American Medical Association. (2025). <em>Prior Authorization Physician Survey: Documentation Burden and Denial Causes.</em> <a href="https://www.ama-assn.org/practice-management/prior-authorization/2025-ama-prior-authorization-survey" target="_blank" rel="noopener">ama-assn.org</a><br>
ONC. (2025). <em>Clinical Decision Support and EHR Certification Criteria.</em> <a href="https://www.healthit.gov/topic/clinical-decision-support" target="_blank" rel="noopener">healthit.gov</a><br>
KLAS Research. (2025). <em>Clinical Documentation and PA Outcomes: Specialty Practice Report.</em> <a href="https://klasresearch.com" target="_blank" rel="noopener">klasresearch.com</a>
</p>

</article>
