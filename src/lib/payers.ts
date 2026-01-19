// Comprehensive list of US insurance payers
// Organized by type for easier management

export const US_PAYERS = [
  // Government Programs
  "Medicare",
  "Traditional Medicare",
  "Medicare Advantage",
  "Medicare Part A",
  "Medicare Part B",
  "Medicare Part D",
  "Medicaid",
  "Tricare",
  "Tricare Prime",
  "Tricare Select",
  "Tricare For Life",
  "CHAMPVA",
  "VA (Veterans Affairs)",

  // National Blues Plans
  "Anthem Blue Cross Blue Shield",
  "Blue Cross Blue Shield",
  "BCBS",
  "Blue Cross",
  "Blue Shield",
  "Anthem",
  "CareFirst BlueCross BlueShield",
  "Highmark Blue Cross Blue Shield",
  "Premera Blue Cross",
  "Regence BlueCross BlueShield",
  "Horizon Blue Cross Blue Shield",
  "Independence Blue Cross",
  "Florida Blue",
  "Blue Cross Blue Shield of Alabama",
  "Blue Cross Blue Shield of Arizona",
  "Blue Cross Blue Shield of Illinois",
  "Blue Cross Blue Shield of Kansas City",
  "Blue Cross Blue Shield of Massachusetts",
  "Blue Cross Blue Shield of Michigan",
  "Blue Cross Blue Shield of North Carolina",
  "Blue Cross Blue Shield of Texas",

  // Major National Carriers
  "UnitedHealthcare",
  "United Healthcare",
  "UHC",
  "United Health",
  "UnitedHealth Group",
  "Aetna",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Kaiser",

  // Regional and Large Plans
  "Molina Healthcare",
  "Centene",
  "Centene Corporation",
  "WellCare",
  "Health Net",
  "Ambetter",
  "Oscar Health",
  "Bright Health",
  "Friday Health Plans",

  // Medicare Advantage Plans
  "AARP Medicare Advantage",
  "UnitedHealthcare Medicare Advantage",
  "Humana Medicare Advantage",
  "Aetna Medicare Advantage",
  "Cigna Medicare Advantage",
  "Kaiser Permanente Medicare Advantage",

  // Medicaid Managed Care
  "Molina Medicaid",
  "UnitedHealthcare Community Plan",
  "Centene Medicaid",
  "WellCare Medicaid",
  "AmeriHealth",
  "Sunshine Health",

  // Regional Plans - West Coast
  "Health Net California",
  "Sharp Health Plan",
  "Western Health Advantage",
  "CalOptima",
  "L.A. Care Health Plan",
  "Inland Empire Health Plan",
  "PacificSource",
  "Providence Health Plan",

  // Regional Plans - East Coast
  "EmblemHealth",
  "Fidelis Care",
  "HealthFirst",
  "MVP Health Care",
  "Neighborhood Health Plan",
  "Tufts Health Plan",

  // Regional Plans - Midwest
  "Medical Mutual of Ohio",
  "HealthPartners",
  "Medica",
  "Priority Health",
  "Network Health",

  // Regional Plans - South
  "Blue Cross and Blue Shield of Louisiana",
  "Community Health Choice",
  "Superior HealthPlan",
  "Parkland Community Health Plan",
  "Peach State Health Plan",
  "WellPoint",

  // Specialty/Niche Plans
  "Moda Health",
  "Tufts",
  "AllWays Health Partners",
  "Harvard Pilgrim",
  "ConnectiCare",
  "Rocky Mountain Health Plans",
  "Community Health Group",
  "CareSource",
  "Fallon Health",
  "Univera Healthcare",

  // Workers' Compensation & Other
  "Workers' Compensation",
  "No-Fault Insurance",
  "Self-Pay",
  "Commercial Insurance",
  "Group Health Plan",
  "Private Insurance",

  // Marketplace Plans
  "Marketplace (ACA)",
  "Healthcare.gov Plan",
  "State Exchange Plan",
]

// Create a sorted, deduplicated list
export const SORTED_PAYERS = Array.from(new Set(US_PAYERS)).sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' })
)

// Function to filter payers based on search query
export function searchPayers(query: string): string[] {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()

  // Exact prefix matches first
  const prefixMatches = SORTED_PAYERS.filter(payer =>
    payer.toLowerCase().startsWith(lowerQuery)
  )

  // Then contains matches
  const containsMatches = SORTED_PAYERS.filter(payer =>
    !payer.toLowerCase().startsWith(lowerQuery) &&
    payer.toLowerCase().includes(lowerQuery)
  )

  // Combine and limit to top 10 results
  return [...prefixMatches, ...containsMatches].slice(0, 10)
}
