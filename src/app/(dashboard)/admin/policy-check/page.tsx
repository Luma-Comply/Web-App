"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Shield,
  AlertCircle,
  Info,
} from "lucide-react"
import { jsPDF } from "jspdf"
import type { PolicyCheckResult } from "@/app/api/admin/policy-check/route"

export default function PolicyCheckPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PolicyCheckResult | null>(null)
  const [error, setError] = useState("")

  async function runPolicyCheck() {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/admin/policy-check", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Policy check failed")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError("Failed to run policy check. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function downloadPDF() {
    if (!result) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Title
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("Medicare Policy Verification Report", pageWidth / 2, y, { align: "center" })
    y += 10

    // Timestamp
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated: ${new Date(result.timestamp).toLocaleString()}`, pageWidth / 2, y, { align: "center" })
    y += 15

    // Summary Section
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Summary", 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    const summaryLines = [
      `Data Version Last Updated: ${result.dataVersion.lastUpdated}`,
      `States Checked: ${result.summary.statesChecked}`,
      `Total Alerts: ${result.summary.totalAlerts}`,
      `  - High Severity: ${result.summary.highSeverity}`,
      `  - Medium Severity: ${result.summary.mediumSeverity}`,
      `  - Low Severity: ${result.summary.lowSeverity}`,
      "",
      `Current WISeR States (Skin Subs): ${result.currentWiserStates.join(", ")}`,
      `States with Active LCD: ${result.statesWithActiveLCD.join(", ")}`,
    ]

    summaryLines.forEach(line => {
      doc.text(line, 20, y)
      y += 6
    })
    y += 10

    // Alerts Section
    if (result.allAlerts.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Policy Alerts Detected", 20, y)
      y += 8

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      result.allAlerts.forEach((alert, index) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }

        const severityIcon = alert.severity === "HIGH" ? "[!]" : alert.severity === "MEDIUM" ? "[*]" : "[i]"
        doc.text(`${index + 1}. ${severityIcon} ${alert.severity}: ${alert.message}`, 20, y)
        y += 5

        if (alert.details) {
          const detailLines = doc.splitTextToSize(`   ${alert.details}`, pageWidth - 40)
          detailLines.forEach((line: string) => {
            doc.text(line, 20, y)
            y += 5
          })
        }
        y += 3
      })
    } else {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 128, 0)
      doc.text("No Policy Changes Detected", 20, y)
      doc.setTextColor(0, 0, 0)
      y += 8

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("All policy data appears to be current and accurate.", 20, y)
      y += 15
    }

    // Research Findings
    y += 10
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Research Findings by State", 20, y)
    y += 8

    result.perplexityFindings.forEach(finding => {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(`${finding.state}:`, 20, y)
      y += 6

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")

      // Truncate research to fit
      const truncatedResearch = finding.research.substring(0, 500) + (finding.research.length > 500 ? "..." : "")
      const researchLines = doc.splitTextToSize(truncatedResearch, pageWidth - 40)
      researchLines.slice(0, 10).forEach((line: string) => {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 20, y)
        y += 4
      })
      y += 5
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Page ${i} of ${pageCount} | Luma Policy Verification | ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        290,
        { align: "center" }
      )
    }

    // Download
    const filename = `policy-check-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(filename)
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-mint" />
          <h1 className="text-2xl font-bold text-dark-bg">Policy Verification</h1>
        </div>
        <p className="text-gray-600">
          Check for Medicare skin substitute policy changes and WISeR pilot updates.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          This page is not indexed. Run weekly to stay current on policy changes.
        </p>
      </div>

      {/* Current Data Info */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Current Stored Data</p>
            <p className="text-blue-700 mt-1">
              <strong>WISeR States (Skin Subs):</strong> TX, OK, NJ, OH
            </p>
            <p className="text-blue-700">
              <strong>Active LCD MACs:</strong> Novitas, CGS, First Coast
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Last data update: January 29, 2026
            </p>
          </div>
        </div>
      </Card>

      {/* Run Check Button */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={runPolicyCheck}
          disabled={loading}
          className="bg-mint hover:bg-mint/90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking Policies...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Policy Check
            </>
          )}
        </Button>

        {result && (
          <Button
            onClick={downloadPDF}
            variant="outline"
            className="border-mint text-mint hover:bg-mint/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF Report
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-mint mx-auto mb-4" />
          <p className="text-gray-600">Querying Perplexity for policy updates...</p>
          <p className="text-sm text-gray-400 mt-1">This may take 30-60 seconds</p>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {result.summary.totalAlerts === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">No Policy Changes Detected</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-600">
                    {result.summary.totalAlerts} Potential Change{result.summary.totalAlerts !== 1 ? "s" : ""} Detected
                  </span>
                </>
              )}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-dark-bg">{result.summary.statesChecked}</p>
                <p className="text-xs text-gray-500">States Checked</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{result.summary.highSeverity}</p>
                <p className="text-xs text-gray-500">High Severity</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{result.summary.mediumSeverity}</p>
                <p className="text-xs text-gray-500">Medium Severity</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{result.summary.lowSeverity}</p>
                <p className="text-xs text-gray-500">Low Severity</p>
              </div>
            </div>
          </Card>

          {/* Alerts */}
          {result.allAlerts.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Alerts</h2>
              <div className="space-y-3">
                {result.allAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      alert.severity === "HIGH"
                        ? "bg-red-50 border-red-200"
                        : alert.severity === "MEDIUM"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {alert.severity === "HIGH" ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      ) : alert.severity === "MEDIUM" ? (
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              alert.severity === "HIGH"
                                ? "destructive"
                                : alert.severity === "MEDIUM"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">{alert.type}</span>
                        </div>
                        <p className="font-medium text-gray-900">{alert.message}</p>
                        {alert.details && (
                          <p className="text-sm text-gray-600 mt-1">{alert.details}</p>
                        )}
                        {alert.detectedState && (
                          <p className="text-xs text-gray-400 mt-1">State: {alert.detectedState}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Research Details (Collapsible) */}
          <Card className="p-6">
            <details>
              <summary className="cursor-pointer text-lg font-semibold mb-4">
                Research Details (click to expand)
              </summary>
              <div className="space-y-4 mt-4">
                {result.perplexityFindings.map((finding, index) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4">
                    <h3 className="font-medium text-dark-bg mb-2">{finding.state}</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {finding.research.substring(0, 1000)}
                      {finding.research.length > 1000 && "..."}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </Card>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 text-center">
            Check completed at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
