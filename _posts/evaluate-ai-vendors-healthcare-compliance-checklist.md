---
title: "How to Evaluate AI Vendors for Healthcare Compliance"
excerpt: "Not every AI vendor claiming HIPAA compliance actually is. Here's the checklist for evaluating vendors before you sign anything."
coverImage: "/assets/blog/evaluate-ai-vendors-healthcare-compliance-checklist/cover.svg"
date: "2026-03-05"
author:
  name: "Luma Team"
  picture: "/assets/blog/authors/luma-team.svg"
category: "Compliance"
ogImage:
  url: "/assets/blog/evaluate-ai-vendors-healthcare-compliance-checklist/cover.svg"
---

<article>

<p>Saying "we're HIPAA compliant" costs a vendor nothing. There's no license, no government registry, no stamp of approval. Any vendor can put it on their website. Many do — with varying degrees of actual compliance behind the claim.</p>

<p>For healthcare organizations evaluating AI vendors, the question is never "are you HIPAA compliant?" The real questions are specific, verifiable, and frankly, most vendors will stumble on at least a few of them.</p>

<p>Here's the full checklist. Save this before your next vendor demo.</p>

<hr/>

<h2>1. Business Associate Agreement (BAA): Non-Negotiable Starting Point</h2>

<p>If a vendor is processing, storing, or transmitting Protected Health Information (PHI) on your behalf, you need a signed BAA before data touches their system. This is HIPAA law, not a preference.</p>

<p>Questions to ask:</p>

<ul>
  <li>Do you provide a BAA? (If the answer is no or hesitant, stop here.)</li>
  <li>Is your BAA standard or do you require redlines? Some vendors offer non-negotiable BAA templates. Know this upfront.</li>
  <li>Does the BAA cover all subprocessors who may touch PHI?</li>
  <li>What's your breach notification timeline under the BAA? (HIPAA requires 60 days from discovery; some BAAs are tighter.)</li>
</ul>

<p>One important alternative: some AI tools are designed from the ground up to operate without PHI. Luma's Safe Harbor approach, for example, generates prior authorization documentation using only a patient's name and clinical data — no dates of birth, no SSNs, no full addresses. Under HIPAA's Safe Harbor de-identification standard, this combination doesn't constitute PHI, which means a BAA isn't required. That's a legitimate architectural choice, not a workaround. But you should understand which approach a vendor is using and verify the logic holds.</p>

<hr/>

<h2>2. Data Handling: Where It Goes, How Long It Stays, What It's Used For</h2>

<p>This is where well-meaning vendors reveal uncomfortable practices. Ask directly:</p>

<ul>
  <li><strong>Data retention:</strong> How long do you retain patient data processed through your system? 30 days? 1 year? Indefinitely?</li>
  <li><strong>Training data:</strong> Is patient data used to train or fine-tune your AI models? Many vendors do this by default. Some allow opt-out. Few advertise it.</li>
  <li><strong>Data residency:</strong> Where are servers located? Does data leave the U.S.?</li>
  <li><strong>Data deletion:</strong> Can patient data be deleted on request? What's the documented process?</li>
</ul>

<p>The training data question deserves special attention. Using de-identified patient data for model improvement is a gray area with evolving guidance. Using identifiable PHI for training without explicit authorization is a HIPAA violation. Ask the question explicitly and get the answer in writing.</p>

<hr/>

<h2>3. Security Certifications: Verified, Not Self-Assessed</h2>

<p>HIPAA has no certification process — you can't be "HIPAA certified." But there are adjacent certifications that provide meaningful third-party verification of security practices.</p>

<p><strong>SOC 2 Type II</strong> is the baseline expectation for any cloud vendor handling sensitive data. Type I is a point-in-time assessment. Type II covers a sustained period (typically 6–12 months) and is meaningfully harder to obtain. Ask for the report, not just the badge.</p>

<p><strong>HITRUST CSF</strong> is the healthcare-specific framework. It's more rigorous than SOC 2 and designed explicitly for HIPAA-adjacent compliance. A HITRUST r2 certification (formerly called "validated") is the gold standard. Many vendors say they're "HITRUST-aligned" — that phrase has no formal meaning. Ask whether they're certified, and at what level.</p>

<p><strong>ISO 27001</strong> is an international information security standard. More common in enterprise software vendors with global customers. Less healthcare-specific but indicates mature security program management.</p>

<p>Red flag: a vendor who offers to share their self-assessment or internal audit instead of a third-party report. Self-attested security posture is worth almost nothing.</p>

<hr/>

<h2>4. Encryption Standards: At Rest and In Transit</h2>

<p>Encryption is table stakes, but the details matter:</p>

<ul>
  <li><strong>In transit:</strong> TLS 1.2 minimum, TLS 1.3 preferred. Ask explicitly — some vendors still support older protocols for "compatibility reasons."</li>
  <li><strong>At rest:</strong> AES-256 is the standard for stored data. Confirm that encryption applies to backups and not just primary storage.</li>
  <li><strong>Key management:</strong> Who controls encryption keys? Are they managed by the vendor, a third-party KMS (like AWS KMS), or can you bring your own keys?</li>
  <li><strong>PHI in logs:</strong> Does the system log PHI in plaintext in application or error logs? This is a common compliance failure that's easy to overlook.</li>
</ul>

<hr/>

<h2>5. Breach Notification: Process and Timeline</h2>

<p>HIPAA requires notification to covered entities within 60 days of breach discovery. The more important question is what happens before that 60-day window.</p>

<p>Ask vendors:</p>

<ul>
  <li>What's your internal incident response process?</li>
  <li>How quickly will you notify us if a breach is suspected (not confirmed)?</li>
  <li>Do you have a documented incident response plan? Can we see the relevant sections?</li>
  <li>Have you had any breaches or security incidents in the past 24 months? (They're required to tell you if they have.)</li>
</ul>

<p>The <a href="https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf" target="_blank" rel="noopener">HHS Breach Portal</a> is public. You can search it. If a vendor has had reportable breaches, they'll appear there. Check before the demo — it changes the conversation.</p>

<hr/>

<h2>6. Subprocessor Transparency</h2>

<p>Most AI vendors use subprocessors: cloud infrastructure (AWS, GCP, Azure), AI model providers (OpenAI, Anthropic, Google), analytics tools, monitoring services. Each one that touches PHI needs to be covered under your BAA.</p>

<p>Ask for a complete subprocessor list — not a description, an actual list. Questions to ask about each material subprocessor:</p>

<ul>
  <li>Do you have a BAA with each subprocessor?</li>
  <li>Are subprocessors restricted from using your data for their own model training? (OpenAI's API terms address this; consumer-tier products don't.)</li>
  <li>How are you notified when a subprocessor changes, and what's the process for objecting?</li>
</ul>

<p>This is one of the most commonly overlooked areas. A vendor's own infrastructure may be locked down — but if they're sending PHI to a large language model provider's API without a proper BAA in place, the compliance posture collapses at that link in the chain.</p>

<hr/>

<h2>7. Access Controls and Audit Logging</h2>

<p>Who inside the vendor's organization can access your data? What's the process?</p>

<ul>
  <li>Is access to customer data role-based and least-privilege?</li>
  <li>Is employee access audited and logged?</li>
  <li>Do you have audit logs you can provide to customers in the event of a compliance review?</li>
  <li>What's the background check process for employees with data access?</li>
</ul>

<p>HIPAA requires covered entities and business associates to implement audit controls — and those controls need to extend through the vendor relationship. If a vendor can't tell you who has access to your data internally, that's a gap.</p>

<hr/>

<h2>Red Flags to Watch For in Demos</h2>

<p>Sales conversations often reveal more than the security questionnaire. Watch for these signals:</p>

<ul>
  <li><strong>"We're fully HIPAA compliant"</strong> with no supporting documentation offered</li>
  <li><strong>Reluctance to provide a BAA template early</strong> in the process ("we can discuss that when you're closer to signing")</li>
  <li><strong>Vague answers about data retention</strong> ("we follow industry best practices")</li>
  <li><strong>Security certifications described as "in progress"</strong> with no timeline</li>
  <li><strong>No clear answer on model training</strong> data usage</li>
  <li><strong>Consumer-tier AI model APIs</strong> used in a healthcare product without explicit API agreements</li>
</ul>

<hr/>

<h2>Questions to Ask at the End of Every Demo</h2>

<p>Five questions that cut through most vendor ambiguity fast:</p>

<ol>
  <li>"Can you send me your current SOC 2 Type II report?"</li>
  <li>"Is patient data ever used to train or improve your models?"</li>
  <li>"Who are your material subprocessors, and do you have BAAs with each?"</li>
  <li>"How quickly would you notify us of a suspected breach?"</li>
  <li>"Can I see your standard BAA template today?"</li>
</ol>

<p>Good vendors answer these without hesitation. The answers themselves matter less than the confidence and specificity behind them.</p>

<p>For more on how HIPAA Safe Harbor approaches can reduce compliance complexity for AI documentation tools specifically, see the related posts on the <a href="https://useluma.io/blog">Luma blog</a>. The architecture choices a vendor makes upfront — PHI vs. non-PHI workflows — affect everything downstream, including your own compliance obligations and audit exposure.</p>

<hr/>

<p style="font-size: 9px; color: #888;">
Sources: U.S. Department of Health and Human Services, HIPAA Security Rule (hhs.gov); HHS Office for Civil Rights, Breach Portal (ocrportal.hhs.gov); HITRUST Alliance, CSF Certification Programs (hitrustalliance.net); AICPA, SOC 2 Framework (aicpa.org); National Institute of Standards and Technology, HIPAA Security Rule Crosswalk to NIST Cybersecurity Framework (nist.gov); American Medical Association, "Navigating HIPAA Compliance for AI Vendors" (ama-assn.org).
</p>

</article>
