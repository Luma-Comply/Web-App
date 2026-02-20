/**
 * Novitas-Covered CTP (Cellular Tissue Products) / Skin Substitutes
 * Based on LCD L35041 Attachment A
 *
 * Note: This list is for initial validation. Perplexity will verify current coverage status
 * as the covered products list can change with LCD updates.
 *
 * Categories:
 * - Bilayer: Contains both epidermis and dermis components
 * - Dermal: Dermis replacement only
 * - Amnion: Derived from amniotic membrane
 * - Collagen: Collagen-based wound matrix
 * - Cryopreserved: Cryogenically preserved human tissue
 * - Synthetic: Engineered/synthetic materials
 */

export interface CTPProduct {
  name: string
  hcpcs: string
  category:
    | "Bilayer"
    | "Dermal"
    | "Amnion"
    | "Collagen"
    | "Cryopreserved"
    | "Synthetic"
    | "Other"
  manufacturer?: string
  aliases?: string[] // Alternative names the product might be called
  maxApplications?: number // LCD application limit if different from default
  notes?: string
}

/**
 * Novitas-covered CTP products as of LCD L35041
 * This is a baseline list - Perplexity verifies current coverage
 */
export const NOVITAS_COVERED_CTPS: CTPProduct[] = [
  // ══════════════════════════════════════════════════════════════
  // BILAYER PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "Apligraf",
    hcpcs: "Q4101",
    category: "Bilayer",
    manufacturer: "Organogenesis",
    aliases: ["Apligraf Wound Matrix"],
  },
  {
    name: "OrCel",
    hcpcs: "Q4102",
    category: "Bilayer",
    manufacturer: "Forticell Bioscience",
  },
  {
    name: "GINTUIT",
    hcpcs: "Q4105",
    category: "Bilayer",
    manufacturer: "Organogenesis",
  },
  {
    name: "TheraSkin",
    hcpcs: "Q4121",
    category: "Bilayer",
    manufacturer: "Misonix",
    aliases: ["TheraSkin Wound Matrix"],
  },

  // ══════════════════════════════════════════════════════════════
  // DERMAL PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "Dermagraft",
    hcpcs: "Q4106",
    category: "Dermal",
    manufacturer: "Organogenesis",
    aliases: ["Dermagraft Wound Dressing"],
  },
  {
    name: "GraftJacket",
    hcpcs: "Q4107",
    category: "Dermal",
    manufacturer: "Wright Medical",
    aliases: ["GraftJacket Regenerative Tissue Matrix"],
  },
  {
    name: "Integra Dermal Regeneration Template",
    hcpcs: "Q4108",
    category: "Dermal",
    manufacturer: "Integra LifeSciences",
    aliases: ["Integra", "IDRT", "Integra Bilayer Matrix"],
  },
  {
    name: "Integra Flowable Wound Matrix",
    hcpcs: "Q4114",
    category: "Dermal",
    manufacturer: "Integra LifeSciences",
  },
  {
    name: "AlloDerm",
    hcpcs: "Q4116",
    category: "Dermal",
    manufacturer: "Allergan",
    aliases: ["AlloDerm Regenerative Tissue Matrix", "AlloDerm RTM"],
  },
  {
    name: "DermaMatrix",
    hcpcs: "Q4122",
    category: "Dermal",
    manufacturer: "Synthes",
  },
  {
    name: "AlloSkin",
    hcpcs: "Q4115",
    category: "Dermal",
    manufacturer: "AlloSource",
  },

  // ══════════════════════════════════════════════════════════════
  // AMNION / AMNIOTIC MEMBRANE PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "EpiFix",
    hcpcs: "Q4186",
    category: "Amnion",
    manufacturer: "MiMedx",
    aliases: ["EpiFix Amniotic Membrane", "EpiFix Sheet"],
  },
  {
    name: "AmnioExcel",
    hcpcs: "Q4137",
    category: "Amnion",
    manufacturer: "Derma Sciences",
  },
  {
    name: "Biovance",
    hcpcs: "Q4154",
    category: "Amnion",
    manufacturer: "Celularity",
    aliases: ["BioDfactor", "Biovance Amniotic Membrane"],
  },
  {
    name: "Amnioband",
    hcpcs: "Q4151",
    category: "Amnion",
    manufacturer: "MTF Biologics",
  },
  {
    name: "NuShield",
    hcpcs: "Q4160",
    category: "Amnion",
    manufacturer: "Organogenesis",
  },
  {
    name: "AmnioArmor",
    hcpcs: "Q4188",
    category: "Amnion",
    manufacturer: "Arteriocyte Medical Systems",
  },
  {
    name: "Affinity",
    hcpcs: "Q4159",
    category: "Amnion",
    manufacturer: "Organogenesis",
  },
  {
    name: "AmnioBand Membrane",
    hcpcs: "Q4168",
    category: "Amnion",
    manufacturer: "MTF Biologics",
  },
  {
    name: "Vendaje",
    hcpcs: "Q4219",
    category: "Amnion",
    manufacturer: "Aedicell",
  },

  // ══════════════════════════════════════════════════════════════
  // CRYOPRESERVED / LIVING TISSUE PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "Grafix",
    hcpcs: "Q4132",
    category: "Cryopreserved",
    manufacturer: "Smith & Nephew",
    aliases: ["Grafix Core", "Grafix PL"],
  },
  {
    name: "Stravix",
    hcpcs: "Q4133",
    category: "Cryopreserved",
    manufacturer: "Osiris Therapeutics",
    aliases: ["Stravix PL"],
  },
  {
    name: "AmnioCyte Plus",
    hcpcs: "Q4230",
    category: "Cryopreserved",
  },

  // ══════════════════════════════════════════════════════════════
  // COLLAGEN PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "PuraPly",
    hcpcs: "Q4195",
    category: "Collagen",
    manufacturer: "Organogenesis",
    aliases: ["PuraPly AM", "PuraPly Antimicrobial"],
  },
  {
    name: "PuraPly XT",
    hcpcs: "Q4196",
    category: "Collagen",
    manufacturer: "Organogenesis",
  },
  {
    name: "Oasis Wound Matrix",
    hcpcs: "Q4102",
    category: "Collagen",
    manufacturer: "Smith & Nephew",
    aliases: ["Oasis Ultra", "Oasis Burn Matrix"],
  },
  {
    name: "Primatrix",
    hcpcs: "Q4110",
    category: "Collagen",
    manufacturer: "Integra LifeSciences",
    aliases: ["Primatrix Dermal Repair Scaffold"],
  },
  {
    name: "MatriStem",
    hcpcs: "Q4118",
    category: "Collagen",
    manufacturer: "ACell",
    aliases: ["MatriStem Wound Matrix", "MatriStem MicroMatrix"],
  },
  {
    name: "Cytal Wound Matrix",
    hcpcs: "Q4166",
    category: "Collagen",
    manufacturer: "ACell",
  },
  {
    name: "Kerecis Omega3",
    hcpcs: "Q4158",
    category: "Collagen",
    manufacturer: "Kerecis",
    aliases: ["Kerecis", "Kerecis Fish Skin"],
    notes: "Fish skin-derived product",
  },

  // ══════════════════════════════════════════════════════════════
  // SYNTHETIC / ENGINEERED PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "Hyalomatrix",
    hcpcs: "Q4117",
    category: "Synthetic",
    manufacturer: "Anika Therapeutics",
  },
  {
    name: "NovoSorb BTM",
    hcpcs: "Q4254",
    category: "Synthetic",
    manufacturer: "PolyNovo",
    aliases: ["NovoSorb Biodegradable Temporizing Matrix"],
  },

  // ══════════════════════════════════════════════════════════════
  // OTHER / SPECIALTY PRODUCTS
  // ══════════════════════════════════════════════════════════════
  {
    name: "Epifix Micronized",
    hcpcs: "Q4145",
    category: "Other",
    manufacturer: "MiMedx",
    aliases: ["AmnioFix Injectable"],
  },
  {
    name: "hMatrix",
    hcpcs: "Q4163",
    category: "Other",
    manufacturer: "Bacterin International",
  },
  {
    name: "Neox Wound Allograft",
    hcpcs: "Q4148",
    category: "Amnion",
    manufacturer: "Amniox Medical",
    aliases: ["Neox 1K", "Neox 100"],
  },
]

/**
 * Search result for CTP product lookup
 */
export interface CTPSearchResult {
  covered: boolean
  product?: CTPProduct
  confidence: "exact" | "partial" | "not_found"
  matchedOn?: string // What the match was found on (name, alias, hcpcs)
  suggestions?: CTPProduct[] // Similar products if not found
}

/**
 * Normalize product name for comparison
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove special characters
    .trim()
}

/**
 * Check if a CTP product is on the Novitas covered list
 * This is an initial check - Perplexity should verify current status
 */
export function isProductCovered(productName: string): CTPSearchResult {
  const normalizedInput = normalizeProductName(productName)

  // Try exact match on name
  for (const product of NOVITAS_COVERED_CTPS) {
    if (normalizeProductName(product.name) === normalizedInput) {
      return {
        covered: true,
        product,
        confidence: "exact",
        matchedOn: "name",
      }
    }
  }

  // Try exact match on HCPCS code
  const upperInput = productName.toUpperCase().trim()
  for (const product of NOVITAS_COVERED_CTPS) {
    if (product.hcpcs === upperInput) {
      return {
        covered: true,
        product,
        confidence: "exact",
        matchedOn: "hcpcs",
      }
    }
  }

  // Try match on aliases
  for (const product of NOVITAS_COVERED_CTPS) {
    if (product.aliases) {
      for (const alias of product.aliases) {
        if (normalizeProductName(alias) === normalizedInput) {
          return {
            covered: true,
            product,
            confidence: "exact",
            matchedOn: `alias: ${alias}`,
          }
        }
      }
    }
  }

  // Try partial match (product name contains input or vice versa)
  for (const product of NOVITAS_COVERED_CTPS) {
    const normalizedProductName = normalizeProductName(product.name)
    if (
      normalizedProductName.includes(normalizedInput) ||
      normalizedInput.includes(normalizedProductName)
    ) {
      return {
        covered: true,
        product,
        confidence: "partial",
        matchedOn: "partial name match",
      }
    }
  }

  // Try partial match on aliases
  for (const product of NOVITAS_COVERED_CTPS) {
    if (product.aliases) {
      for (const alias of product.aliases) {
        const normalizedAlias = normalizeProductName(alias)
        if (
          normalizedAlias.includes(normalizedInput) ||
          normalizedInput.includes(normalizedAlias)
        ) {
          return {
            covered: true,
            product,
            confidence: "partial",
            matchedOn: `partial alias match: ${alias}`,
          }
        }
      }
    }
  }

  // Not found - provide suggestions based on similarity
  const suggestions = findSimilarProducts(productName, 3)

  return {
    covered: false,
    confidence: "not_found",
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  }
}

/**
 * Find similar products using simple string similarity
 */
function findSimilarProducts(input: string, maxResults: number): CTPProduct[] {
  const normalizedInput = normalizeProductName(input)
  const scored: Array<{ product: CTPProduct; score: number }> = []

  for (const product of NOVITAS_COVERED_CTPS) {
    const normalizedName = normalizeProductName(product.name)
    const score = calculateSimilarity(normalizedInput, normalizedName)

    // Also check aliases
    let bestScore = score
    if (product.aliases) {
      for (const alias of product.aliases) {
        const aliasScore = calculateSimilarity(
          normalizedInput,
          normalizeProductName(alias)
        )
        if (aliasScore > bestScore) {
          bestScore = aliasScore
        }
      }
    }

    if (bestScore > 0.3) {
      // Minimum similarity threshold
      scored.push({ product, score: bestScore })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.product)
}

/**
 * Simple string similarity calculation (Dice coefficient)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1
  if (str1.length < 2 || str2.length < 2) return 0

  const bigrams1 = new Set<string>()
  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2))
  }

  let intersectionSize = 0
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.substring(i, i + 2)
    if (bigrams1.has(bigram)) {
      intersectionSize++
      bigrams1.delete(bigram) // Count each bigram only once
    }
  }

  return (2.0 * intersectionSize) / (str1.length - 1 + (str2.length - 1))
}

/**
 * Get all products by category
 */
export function getProductsByCategory(
  category: CTPProduct["category"]
): CTPProduct[] {
  return NOVITAS_COVERED_CTPS.filter((p) => p.category === category)
}

/**
 * Get all unique HCPCS codes
 */
export function getAllHCPCSCodes(): string[] {
  return [...new Set(NOVITAS_COVERED_CTPS.map((p) => p.hcpcs))]
}

/**
 * Get product by HCPCS code
 */
export function getProductByHCPCS(hcpcs: string): CTPProduct | undefined {
  return NOVITAS_COVERED_CTPS.find(
    (p) => p.hcpcs === hcpcs.toUpperCase().trim()
  )
}
