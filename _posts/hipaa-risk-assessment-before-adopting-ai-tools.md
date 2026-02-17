---
title: "How to Run a HIPAA Risk Assessment Before Adopting AI Tools"
excerpt: "You're required to do a risk assessment before deploying AI tools that touch patient data. Here's a practical walkthrough."
coverImage: "/assets/blog/hipaa-risk-assessment-before-adopting-ai-tools/cover.svg"
date: "2026-03-20"
author:
  name: "Luma Team"
  picture: "/assets/blog/authors/luma-team.svg"
category: "Tutorials"
ogImage:
  url: "/assets/blog/hipaa-risk-assessment-before-adopting-ai-tools/cover.svg"
---

<article>

<h2>This Isn't Optional</h2>

<p>The HIPAA Security Rule requires every covered entity and business associate to conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic PHI. That's <a href="https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.308" target="_blank" rel="noopener">45 CFR 164.308(a)(1)</a>. It has been the law since 2005.</p>

<p>What's changed in 2026 is enforcement. OCR has made it explicit that deploying AI tools that handle PHI without first updating your risk assessment is a compliance failure — not a gray area. In recent resolution agreements, the agency has pointed directly at organizations that added new technology to their environment without assessing the associated risks.</p>

<p>If you're planning to adopt any AI tool that touches patient data, you need a risk assessment first. Here's how to actually do one.</p>

<h2>What OCR Expects to See</h2>

<p>OCR has published <a href="https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html" target="_blank" rel="noopener">detailed guidance</a> on what an acceptable risk assessment looks like. The short version: it must be documented, it must be organization-specific, and it must result in a remediation plan.</p>

<p>A risk assessment that lives in someone's head doesn't satisfy the requirement. Neither does a risk assessment that was accurate three years ago but hasn't been updated since you added new systems. OCR looks for evidence of an ongoing process — not a one-time exercise.</p>

<p>The assessment must cover the entire organization, not just the specific tool you're adding. But when you're adding a new AI tool, you need to document specifically how it changes your risk picture.</p>

<h2>Step 1: Scope Everything That Touches Patient Data</h2>

<p>Start by inventorying every system, application, and workflow in your organization that creates, receives, maintains, or transmits ePHI. This is the scope of your assessment.</p>

<p>For an AI tool adoption specifically, you're adding to this inventory. Document:</p>

<ul>
  <li>The name of the AI tool and its vendor</li>
  <li>What PHI it receives, and in what form (full records, discrete data fields, free-text notes)</li>
  <li>Where it receives PHI from (EHR integration, manual input, document upload)</li>
  <li>Where output is stored and who can access it</li>
  <li>Whether the vendor is a Business Associate and whether a BAA is in place</li>
  <li>What happens to PHI after a session ends — is it retained, logged, used for training?</li>
</ul>

<p>This inventory step is where most organizations find surprises. AI tools that were adopted informally by clinical staff, tools that access PHI through broad EHR integrations, tools that retain data in ways the organization didn't realize — all of this surfaces during a proper scoping exercise.</p>

<h2>Step 2: Map the Data Flows</h2>

<p>Once you have the inventory, map how PHI moves. For each system in scope, document: where data enters, where it goes from there, where it's stored, who can access it, and how it leaves.</p>

<p>For an AI tool, the flow typically looks like this: PHI originates in your EHR or clinical systems → gets transferred to the AI tool (via API call, file upload, or direct integration) → the tool processes it and returns an output → the output gets saved somewhere (the tool's system, your EHR, or a local file).</p>

<p>Each handoff in that flow is a potential risk point. The data in transit needs encryption. The storage at each point needs access controls. The vendor who receives the data is either a Business Associate (if they receive PHI) or not (if you've applied proper de-identification first).</p>

<p>Drawing the data flow isn't just a documentation exercise. It often reveals that PHI is flowing to places that weren't anticipated — a vendor's logging system, a third-party analytics service the vendor uses, or a cloud storage bucket that doesn't have the same controls as the primary product.</p>

<h2>Step 3: Identify Threats and Vulnerabilities</h2>

<p>With the scope and data flows documented, you assess what could go wrong. OCR's framework calls for identifying both threats (things that could cause harm) and vulnerabilities (weaknesses that could be exploited).</p>

<p>For AI tools specifically, the relevant threat categories include:</p>

<p><strong>Unauthorized access at the vendor.</strong> If the vendor is breached, what PHI would be exposed? What are their security controls? Do you have evidence of their security practices beyond their SOC 2 report — which is a point-in-time snapshot, not ongoing assurance?</p>

<p><strong>Data retention beyond what you expect.</strong> Many AI tools retain conversation history, input data, or derived data for product improvement purposes. Review the vendor's data retention and training practices. If you don't know, ask explicitly and get the answer in writing.</p>

<p><strong>Prompt injection and adversarial inputs.</strong> AI tools that accept text inputs can be manipulated to leak data or produce inappropriate outputs. This is a newer threat category but a real one, particularly for tools that access clinical systems or documents.</p>

<p><strong>Over-collection of PHI.</strong> Tools that pull broad EHR data when they only need specific fields create excess PHI exposure. The more PHI that enters the system, the larger the breach surface area.</p>

<p><strong>Access control failures.</strong> Who in your organization can use the tool? Is access controlled by role? Is there audit logging of who accessed what? These are standard security questions that apply equally to AI tools.</p>

<h2>Step 4: Assess Current Safeguards</h2>

<p>For each threat and vulnerability identified, document what safeguards currently exist. This is where you assess whether your existing controls adequately address the risks introduced by the new tool.</p>

<p>The three categories of safeguards are administrative (policies, training, procedures), physical (facility and device security), and technical (access controls, encryption, audit logs). For AI tool adoption, technical and administrative safeguards are usually most relevant.</p>

<p>Common gaps that surface at this stage:</p>

<ul>
  <li>No formal policy governing AI tool use or approval</li>
  <li>No process for evaluating vendor security before tool adoption</li>
  <li>No audit logging of what data was submitted to the AI tool or by whom</li>
  <li>No minimum necessary analysis — the tool receives more PHI than the task requires</li>
  <li>BAA not in place, or in place with a vendor whose product actually makes them a business associate</li>
</ul>

<h2>Step 5: Determine the Risk Level and Document It</h2>

<p>For each identified vulnerability, assign a risk level based on likelihood and impact. There's no required methodology, but the <a href="https://www.nist.gov/cyberframework" target="_blank" rel="noopener">NIST Cybersecurity Framework</a> and <a href="https://www.hhs.gov/hipaa/for-professionals/security/guidance/cybersecurity/index.html" target="_blank" rel="noopener">HHS's own Security Risk Assessment Tool</a> are widely used and OCR-recognized starting points.</p>

<p>The documentation is what matters for audit purposes. A well-documented risk assessment that identifies moderate risks and has a credible remediation plan is a better compliance posture than an undocumented assessment that identified no risks.</p>

<p>OCR investigators ask to see the written assessment. "We went through it verbally" is not an acceptable answer. The documentation should include: scope, methodology, list of identified threats and vulnerabilities, current safeguards, risk ratings, and the resulting remediation plan.</p>

<h2>Step 6: Build a Remediation Plan</h2>

<p>Finding risks without addressing them is arguably worse than not looking. The risk assessment feeds a remediation plan that documents what actions will be taken to reduce each identified risk, who is responsible, and by when.</p>

<p>For an AI tool adoption, remediation steps might include: negotiating a BAA before the tool goes live, restricting the data fields the tool can receive, implementing access logging, training staff on the tool's proper use, or — if the risks can't be adequately addressed — deciding not to deploy the tool at all.</p>

<p>Remediation plans don't need to close every gap immediately. They need to be credible and tracked. OCR looks for evidence that the organization took identified risks seriously and had a plan for addressing them.</p>

<h2>When the Assessment Is Simpler</h2>

<p>The scope and complexity of a risk assessment depends heavily on how much PHI the new tool actually handles. A tool that processes full patient records creates a much larger compliance surface than one that works with de-identified inputs.</p>

<p>This is one practical advantage of Safe Harbor de-identification as an architectural approach. When <a href="https://useluma.io/blog">Luma</a> processes prior authorization documentation using only de-identified inputs — diagnosis codes, age, treatment history, lab values without direct identifiers — the risk assessment for the Luma integration is narrower. The data entering the tool isn't PHI, so the PHI-specific threat categories don't apply to it.</p>

<p>The risk assessment still needs to happen. You still need to document the data flow, evaluate the tool's security practices, and confirm the de-identification is properly applied before inputs leave your environment. But the risk surface is smaller, the likelihood of significant breach impact is lower, and the remediation burden is lighter.</p>

<p>Choosing tools with narrower PHI requirements isn't just a compliance preference. It materially simplifies the risk assessment process and reduces the ongoing compliance management burden.</p>

<h2>Running This Assessment on a Schedule</h2>

<p>A risk assessment is a point-in-time document that becomes stale the moment your environment changes. OCR expects covered entities to review and update their assessments periodically and whenever significant changes occur — new systems, new vendors, organizational changes, security incidents.</p>

<p>AI tool adoption is exactly the kind of change that triggers a required update. So is switching vendors, significantly expanding an existing tool's access, or adding a new clinical workflow that routes PHI differently.</p>

<p>The practical approach: build a trigger list of events that require a risk assessment update, and assign someone the responsibility to run that process. The assessment itself can be managed internally or with outside help from a HIPAA consultant — both are acceptable as long as the result is documented and credible.</p>

<p>The organizations that handle OCR investigations well typically share one characteristic: they can produce a current, comprehensive, well-documented risk assessment on short notice. That document is the first thing an investigator asks for. Making sure it exists — and reflects your actual current environment — is the most important thing you can do before adding any new AI tool to your clinical workflow.</p>

<hr/>

<p style="font-size: 9px; color: #888;">
Sources:<br/>
<a href="https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.308" target="_blank" rel="noopener" style="color: #888;">45 CFR 164.308 — Administrative Safeguards (Security Rule)</a><br/>
<a href="https://www.hhs.gov/hipaa/for-professionals/security/guidance/cybersecurity/index.html" target="_blank" rel="noopener" style="color: #888;">HHS — Security Risk Assessment Tool (SRA Tool)</a><br/>
<a href="https://www.nist.gov/cyberframework" target="_blank" rel="noopener" style="color: #888;">NIST — Cybersecurity Framework</a><br/>
<a href="https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html" target="_blank" rel="noopener" style="color: #888;">HHS — HIPAA Security Rule Guidance Materials</a><br/>
<a href="https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/index.html" target="_blank" rel="noopener" style="color: #888;">HHS OCR — HIPAA Audit Protocol</a>
</p>

</article>
