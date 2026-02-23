import { FileText, Loader2, MessageSquare, Send, ThumbsUp, ThumbsDown } from "lucide-react"

export function getStatusConfig(status: string) {
  switch (status) {
    case "chat":
      return { label: "Chat", classes: "bg-purple-100 text-purple-700", icon: MessageSquare }
    case "draft":
      return { label: "Draft", classes: "bg-gray-100 text-gray-700", icon: FileText }
    case "generating":
      return { label: "Generating", classes: "bg-amber-100 text-amber-700", icon: Loader2 }
    case "submitted":
      return { label: "Submitted", classes: "bg-blue-100 text-blue-700", icon: Send }
    case "approved":
      return { label: "Approved", classes: "bg-green-100 text-green-700", icon: ThumbsUp }
    case "denied":
      return { label: "Denied", classes: "bg-coral/20 text-coral", icon: ThumbsDown }
    default:
      return { label: status, classes: "bg-gray-100 text-gray-700", icon: FileText }
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

export function toInputDateStr(date: Date): string {
  return date.toISOString().split("T")[0]
}

// ─── Gender Inference from First Name ────────────────────────────

const MALE_NAMES = new Set([
  "aaron","adam","adrian","alan","albert","alex","alexander","alfred","andrew","anthony","antonio","arthur","austin",
  "barry","benjamin","bernard","billy","blake","bobby","brad","bradley","brandon","brent","brett","brian","bruce","bryan",
  "caleb","calvin","cameron","carl","carlos","carter","chad","charles","chase","chris","christian","christopher","clarence","clifford","cody","cole","colin","connor","corey","craig","curtis",
  "dale","damian","damon","dan","daniel","danny","darren","daryl","dave","david","dean","dennis","derek","desmond","devin","diego","dominic","don","donald","douglas","drew","dustin","dylan",
  "earl","eddie","edgar","edward","edwin","eli","elijah","elliot","elliott","eric","erik","ernest","ethan","eugene","evan","everett",
  "felix","fernando","floyd","francis","francisco","frank","franklin","fred","frederick",
  "gabriel","garrett","gary","gavin","gene","george","gerald","gilbert","glen","glenn","gordon","graham","grant","greg","gregory","greyson",
  "harold","harrison","harry","harvey","hector","henry","herbert","herman","howard","hudson","hugh","hunter",
  "ian","isaac","isaiah","ivan",
  "jack","jackson","jacob","jake","james","jared","jason","javier","jay","jayden","jeff","jeffrey","jeremy","jerome","jerry","jesse","jim","jimmy","joe","joel","john","johnny","jon","jonathan","jordan","jorge","jose","joseph","joshua","juan","julian","justin",
  "karl","keith","kelly","ken","kenneth","kevin","kurt","kyle",
  "lance","larry","lawrence","lee","leo","leon","leonard","liam","lloyd","logan","louis","lucas","luis","luke","luther",
  "malcolm","marcus","mario","mark","marshall","martin","marvin","mason","matt","matthew","maurice","max","maxwell","michael","miguel","miles","mitchell","mohamed","mohammed","morgan","muhammad",
  "nathan","nathaniel","neil","nelson","nicholas","nick","noah","nolan","norman",
  "oliver","omar","oscar","owen",
  "patrick","paul","pedro","perry","peter","philip","phillip","pierce","preston",
  "quincy","quinn",
  "ralph","ramon","randall","randy","raymond","reed","reginald","ricardo","richard","rick","riley","rob","robert","roberto","rodney","roger","roland","roman","ronald","ross","roy","ruben","russell","ryan",
  "sam","samuel","santiago","scott","sean","sebastian","seth","shane","shaun","shawn","simon","spencer","stanley","stephen","steve","steven","stuart",
  "taylor","ted","terry","theodore","thomas","timothy","todd","tom","tommy","tony","travis","trevor","troy","tucker","tyler",
  "vernon","victor","vincent","virgil",
  "wade","wallace","walter","warren","wayne","wesley","william","willie","winston","wyatt",
  "xavier","zachary","zane",
])

const FEMALE_NAMES = new Set([
  "aaliyah","abigail","addison","adriana","aimee","alexandra","alexis","alice","alicia","alina","alison","allison","alyssa","amanda","amber","amelia","amy","andrea","angela","angelina","anita","ann","anna","annette","annie","april","aria","ariana","ashley","aubrey","audrey","aurora","autumn","ava","avery",
  "bailey","barbara","beatrice","becky","belinda","bella","bernadette","beth","bethany","betty","beverly","bianca","bonnie","brandy","brenda","bridget","brittany","brooke",
  "caitlin","camila","candace","cara","carla","carmen","carol","carolina","caroline","carolyn","casey","cassandra","catherine","cecilia","charlotte","chelsea","cheryl","chloe","christina","christine","cindy","claire","clara","claudia","colleen","connie","constance","cora","courtney","crystal","cynthia",
  "daisy","dana","daniela","danielle","daphne","darlene","dawn","debbie","deborah","debra","delilah","denise","desiree","diana","diane","dolores","donna","doris","dorothy",
  "eileen","elaine","eleanor","elena","eliana","elise","eliza","elizabeth","ella","ellen","ellie","emily","emma","erica","erin","esther","eva","evelyn",
  "faith","fatima","felicia","fiona","florence","frances","francesca",
  "gabriella","gabrielle","gail","gemma","genevieve","georgia","geraldine","gina","gloria","grace","gwen","gwendolyn",
  "hailey","hannah","harper","harriet","hayley","hazel","heather","heidi","helen","hillary","holly","hope",
  "imani","ingrid","irene","iris","isabella","isabelle","ivy",
  "jacqueline","jade","janice","jasmine","jean","jeanette","jenna","jennifer","jenny","jessica","jill","jillian","jo","joan","joanna","joanne","jocelyn","jodi","jolene","jordan","josephine","joy","joyce","judith","judy","julia","juliana","julie","june","justine",
  "kaitlyn","kara","karen","karina","kate","katherine","kathleen","kathryn","kathy","katie","katrina","kayla","kelly","kelsey","kendra","kennedy","kim","kimberly","kristen","kristin","kristina","krystal","kylie",
  "lacey","laila","lana","laura","lauren","layla","leah","leigh","lena","leslie","lillian","lily","linda","lindsey","lisa","logan","lois","loretta","lori","lorraine","louise","lucia","lucy","luna","lydia","lynn",
  "mackenzie","madeline","madison","maggie","maia","mallory","mandy","margaret","maria","mariah","marie","marilyn","marina","marissa","marlene","martha","mary","maya","megan","melanie","melissa","melody","mercedes","meredith","mia","michaela","michelle","mikayla","mildred","miranda","molly","monica","morgan","mya",
  "nadia","nancy","naomi","natalia","natalie","natasha","nellie","nicole","nina","nora","norma",
  "olivia",
  "paige","pamela","patricia","patty","paula","pauline","peyton","phyllis","piper","priscilla",
  "quinn",
  "rachel","raquel","reagan","rebecca","regina","renee","rhonda","riley","rita","roberta","robin","rosa","rose","rosemary","roxanne","ruby","ruth",
  "sabrina","sadie","sally","samantha","sandra","sandy","sara","sarah","savannah","scarlett","selena","serena","shannon","sharon","sheila","shelby","shelley","sherry","shirley","sierra","simone","skylar","sofia","sonia","sophia","stacey","stacy","stella","stephanie","sue","summer","susan","suzanne","sydney","sylvia",
  "tabitha","tamara","tammy","tanya","tara","tatiana","taylor","teresa","tessa","theresa","tiffany","tina","tracy","tricia","trinity",
  "valentina","valerie","vanessa","veronica","victoria","violet","virginia","vivian",
  "wendy","whitney","willow",
  "yasmine","yolanda","yvonne",
  "zoe","zoey",
])

/**
 * Infers gender from a first name using a local lookup of common names.
 * Returns "Male", "Female", or null if the name isn't recognized.
 * No external API calls — purely local.
 */
export function inferGender(firstName: string): "Male" | "Female" | null {
  if (!firstName) return null
  const normalized = firstName.trim().toLowerCase()
  if (MALE_NAMES.has(normalized)) return "Male"
  if (FEMALE_NAMES.has(normalized)) return "Female"
  return null
}

// ─── Name / Payer Extraction Utilities ───────────────────────────

const excludedWords = new Set([
  'the', 'last', 'first', 'patient', 'this', 'that', 'these', 'those', 'with', 'from', 'for', 'and', 'or', 'but', 'see', 'clinical', 'notes',
  'amniotic', 'membrane', 'simplimax', 'biologic', 'therapy', 'treatment', 'medication', 'drug', 'infusion', 'injection',
  'humira', 'remicade', 'enbrel', 'stelara', 'cosentyx', 'taltz', 'skyrizi', 'rinvoq', 'xeljanz', 'orencia', 'actemra',
  'methotrexate', 'prednisone', 'sulfasalazine', 'plaquenil', 'hydroxychloroquine',
  'medicare', 'medicaid', 'insurance', 'diagnosis', 'medical', 'hospital', 'clinic', 'doctor', 'physician', 'nurse'
])

const medicalPatterns = [
  /max$/i,
  /^bio/i,
  /mab$/i,
  /^anti/i,
  /tinib$/i,
  /olimus$/i,
  /parin$/i,
  /mycin$/i,
  /cillin$/i,
  /^\d/,
]

export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  if (name.length < 3) return false
  if (!/^[A-Z]/.test(name)) return false
  if (excludedWords.has(name.toLowerCase())) return false
  for (const pattern of medicalPatterns) {
    if (pattern.test(name)) return false
  }
  if (!/^[A-Za-z'-]+$/.test(name)) return false
  if (name.replace(/[^A-Za-z]/g, '').length < 2) return false
  if (name === name.toUpperCase() && name.length > 1) return false
  if (name.length > 20) return false
  return true
}

export function extractPatientNameFromNotes(
  diseaseActivity: string | undefined,
  generatedOutput: string | null | undefined,
  editedOutput: string | undefined
): { first: string; last: string } | null {
  if (!diseaseActivity) return null

  // Pattern 1: Look in generated output first
  const output = generatedOutput || editedOutput
  if (output) {
    const outputPattern = /for\s+([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s|,|\.|who|is|has)/i
    const outputMatch = output.match(outputPattern)
    if (outputMatch) {
      const first = outputMatch[1].trim()
      const last = outputMatch[2].trim()
      if (isValidName(first) && isValidName(last)) {
        return { first, last }
      }
    }
  }

  const notes = [diseaseActivity].filter(Boolean).join(' ')

  // Pattern 2: "Patient: [FirstName] [LastName]"
  const labelPattern = /(?:patient|name|pt):\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/i
  const labelMatch = notes.match(labelPattern)
  if (labelMatch) {
    const first = labelMatch[1].trim()
    const last = labelMatch[2].trim()
    if (isValidName(first) && isValidName(last)) {
      return { first, last }
    }
  }

  // Pattern 3: "Patient [FirstName] [LastName]"
  const patientPattern = /(?:patient|pt\.?)\s+([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/i
  const patientMatch = notes.match(patientPattern)
  if (patientMatch) {
    const first = patientMatch[1].trim()
    const last = patientMatch[2].trim()
    if (isValidName(first) && isValidName(last)) {
      return { first, last }
    }
  }

  // Pattern 4: "[FirstName] [LastName] is a X-year-old"
  const agePattern = /([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s+is\s+a|\s+is\s+an|,\s+a)\s+\d+[-\s]?(?:year|yr|yo)/i
  const ageMatch = notes.match(agePattern)
  if (ageMatch) {
    const first = ageMatch[1].trim()
    const last = ageMatch[2].trim()
    if (isValidName(first) && isValidName(last)) {
      return { first, last }
    }
  }

  // Pattern 5: "[FirstName]'s" possessive form
  const possessivePattern = /([A-Z][a-z]{2,})'s\s+(?:wounds|condition|treatment|case|history)/i
  const possessiveMatch = notes.match(possessivePattern)
  if (possessiveMatch) {
    const firstName = possessiveMatch[1].trim()
    if (isValidName(firstName)) {
      const fullNamePattern = new RegExp(`${firstName}\\s+([A-Z][a-z]{2,})`, 'i')
      const fullMatch = notes.match(fullNamePattern)
      if (fullMatch) {
        const last = fullMatch[1].trim()
        if (isValidName(last)) {
          return { first: firstName, last }
        }
      }
    }
  }

  // Pattern 6: "for [FirstName] [LastName]"
  const forPattern = /for\s+(?:patient\s+)?([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s|,|\.|who|is|has)/i
  const forMatch = notes.match(forPattern)
  if (forMatch) {
    const first = forMatch[1].trim()
    const last = forMatch[2].trim()
    if (isValidName(first) && isValidName(last)) {
      return { first, last }
    }
  }

  return null
}

export function extractPayerFromNotes(
  diseaseActivity: string | undefined,
  generatedOutput: string | null | undefined,
  editedOutput: string | undefined
): string | null {
  if (!diseaseActivity) return null

  const insuranceProviders = [
    'Blue Cross Blue Shield', 'BCBS', 'Blue Cross', 'Blue Shield',
    'Cigna', 'Aetna', 'UnitedHealthcare', 'United Health', 'Medicare', 'Medicaid',
    'Anthem', 'Humana', 'Kaiser', 'Kaiser Permanente', 'Molina', 'Centene',
    'WellCare', 'Wellpoint', 'Health Net', 'Tricare', 'CHAMPVA'
  ]

  // Pattern 1: Look in generated output first
  const output = generatedOutput || editedOutput
  if (output) {
    for (const provider of insuranceProviders) {
      const pattern = new RegExp(`^[^\\n]*${provider.replace(/\s+/g, '\\s+')}[^\\n]*$`, 'im')
      if (pattern.test(output)) {
        return provider
      }
    }
  }

  const notes = [diseaseActivity].filter(Boolean).join(' ')

  // Pattern 2: Look for "insurance: [Provider]"
  for (const provider of insuranceProviders) {
    const patterns = [
      new RegExp(`(?:insurance|payer|coverage):\\s*${provider.replace(/\s+/g, '\\s+')}`, 'i'),
      new RegExp(`${provider.replace(/\s+/g, '\\s+')}\\s+(?:insurance|payer|coverage)`, 'i'),
      new RegExp(`\\b${provider.replace(/\s+/g, '\\s+')}\\b`, 'i')
    ]

    for (const pattern of patterns) {
      if (pattern.test(notes)) {
        return provider
      }
    }
  }

  return null
}

/**
 * Strips bracket placeholders from generated documentation.
 * Handles both new and legacy stored outputs.
 */
export function sanitizeDocumentOutput(text: string, patientAge?: number | string): string {
  if (!text) return text
  return text
    // Remove "RECOMMENDED SUPPORTING DOCUMENTS" section — must be exact heading on its own line
    .replace(/\n*^RECOMMENDED SUPPORTING DOCUMENTS\b.*$[\s\S]*$/m, '')
    .replace(/\n*^Recommended Supporting Documents\b.*$[\s\S]*$/m, '')
    // Replace DOB lines with Age
    .replace(/^\s*(?:Date of Birth|DOB)\s*:.*$/gim, patientAge ? `Age: ${patientAge}` : '')
    // NUCLEAR: Remove ALL square bracket content
    .replace(/\[[^\]]*\]/g, '')
    // Remove empty-value label lines
    .replace(/^\s*(?:Date|Policy Number|Clinic Name|Contact Phone|Contact Fax|Fax|Phone|NPI|Medicare ID|Insurance ID|Member ID|Referring Provider|Referring Physician|Provider Name|Provider NPI|Age Group|Medicare Eligible|Provider Contact Information|Letterhead|Tax ID|TIN|Credentials|Contact Information)\s*:?\s*$/gim, '')
    // Remove "Contact Information: , " pattern (comma with empty values)
    .replace(/^\s*Contact Information\s*:\s*,\s*$/gim, '')
    // Remove generic provider filler
    .replace(/^\s*(?:Referring (?:Provider|Physician))\s*:\s*Advanced Wound Care Provider\s*$/gim, '')
    .replace(/^\s*Advanced Wound Care Provider\s*$/gim, '')
    .replace(/^\s*Electronically Signed\s*$/gim, '')
    // Clean up multiple consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const TIDBITS = [
  "Did you know? Insurance denials cost healthcare practices over $262 billion annually.",
  "Fact: 65% of denials are recoverable, but only 2% are ever appealed.",
  "Studies show: Prior auth appeals take 2-4 hours manually. We reduce this to minutes.",
  "Healthcare providers spend 13 hours per week on prior authorization paperwork.",
  "Our AI reviews 1000+ payer policies to find the strongest evidence for your case.",
  "Average approval rate increases by 40% when using evidence-based documentation.",
  "Fact: 89% of denials are due to insufficient documentation, not medical necessity.",
]

export function getPayerSpecificTidbit(payerName: string | undefined): string {
  return `Searching current Clinical Policy Bulletins for ${payerName || "payer"}...`
}
