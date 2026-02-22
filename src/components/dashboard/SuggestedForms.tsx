"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface SuggestedForm {
    id: string
    title: string
    description: string
    form_type: string
    confidence: "high" | "medium" | "low"
    download_url: string | null
    is_external: boolean
    source_snippets: string[]
}

interface SuggestedFormsProps {
    caseId: string
    lastGenerated: string | null // Used to trigger refresh
}

export function SuggestedForms({ caseId, lastGenerated }: SuggestedFormsProps) {
    const [forms, setForms] = useState<SuggestedForm[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchForms()
    }, [caseId, lastGenerated])

    async function fetchForms() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("case_suggested_forms")
                .select("*")
                .eq("case_id", caseId)
                .order("created_at", { ascending: false })

            if (error) {
                console.error("Error fetching forms:", error)
                return
            }

            // Deduplicate by title if needed, or just show all
            // For now, simpler is better
            setForms(data || [])
        } catch (err) {
            console.error("Failed to fetch suggested forms", err)
        } finally {
            setLoading(false)
        }
    }

    async function downloadFormsPDF() {
        try {
            const jsPDF = (await import("jspdf")).default
            const autoTable = (await import("jspdf-autotable")).default

            const doc = new jsPDF()

            // Header
            // Luma Branding
            doc.setFont("helvetica", "bold")
            doc.setFontSize(24)
            doc.setTextColor(52, 78, 65) // Dark Green #344E41
            doc.text("Luma", 14, 20)

            doc.setFont("helvetica", "normal")
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            const urlWidth = doc.getTextWidth("www.useluma.io")
            const pageWidth = doc.internal.pageSize.getWidth()
            doc.text("www.useluma.io", pageWidth - 14 - urlWidth, 20)

            // Separator
            doc.setDrawColor(200, 200, 200)
            doc.line(14, 28, pageWidth - 14, 28)

            // Title
            doc.setFontSize(16)
            doc.setTextColor(50)
            doc.text("Suggested Supporting Documents Checklist", 14, 40)

            doc.setFontSize(10)
            doc.setTextColor(100)
            doc.text(`Case ID: ${caseId.slice(0, 8)}`, 14, 47)
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52)

            // Prepare table data
            const tableBody = forms.map(form => [
                form.title,
                form.form_type.replace('_', ' ').toUpperCase(),
                form.confidence.toUpperCase(),
                form.description
            ])

            autoTable(doc, {
                startY: 55,
                head: [['Document Name', 'Type', 'Confidence', 'Reasoning']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [52, 78, 65], textColor: 255, fontSize: 9, cellPadding: 2 },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [200, 200, 200],
                    overflow: 'linebreak' // Ensure text wraps
                },
                columnStyles: {
                    0: { cellWidth: 40 }, // Title - Reduced slightly
                    1: { cellWidth: 25 }, // Type - Reduced slightly
                    2: { cellWidth: 25 }, // Confidence - Increased to fit header
                    3: { cellWidth: 'auto' } // Description - Maximize space
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                didParseCell: function (data: any) {
                    // Color coordinate Confidence column
                    if (data.section === 'body' && data.column.index === 2) {
                        const text = data.cell.text[0] || '';
                        if (text === 'HIGH') {
                            data.cell.styles.textColor = [22, 163, 74]; // Green-600
                            data.cell.styles.fontStyle = 'bold';
                        } else if (text === 'MEDIUM') {
                            data.cell.styles.textColor = [234, 179, 8]; // Yellow-600
                            data.cell.styles.fontStyle = 'bold';
                        } else if (text === 'LOW') {
                            data.cell.styles.textColor = [220, 38, 38]; // Red-600
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
                margin: { top: 20, right: 14, bottom: 20, left: 14 }
            })

            doc.save(`suggested-forms-${caseId.slice(0, 6)}.pdf`)
        } catch (err) {
            console.error("Failed to generate PDF:", err)
        }
    }

    if (loading && forms.length === 0) {
        return (
            <Card className="p-6 border-dashed border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                    <span className="text-sm">Finding recommended forms...</span>
                </div>
            </Card>
        )
    }

    if (forms.length === 0) {
        return null // Don't show anything if no suggestions found
    }

    return (
        <div className="space-y-4">
            {/* Header - stacks on mobile, inline on tablet+ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-sans font-semibold text-dark-bg">
                        Suggested Supporting Documents
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Based on payer policy research, these documents may increase approval odds.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadFormsPDF}
                    className="gap-2 w-full sm:w-auto shrink-0"
                >
                    <Download className="w-4 h-4" />
                    Download Checklist
                </Button>
            </div>

            {/* Grid - 1 col mobile, 2 cols tablet, 3 cols on larger tablets/desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {forms.map((form) => (
                    <Card key={form.id} className="p-3 sm:p-4 !bg-white rounded-xl border border-sage-medium/30 shadow-sm hover:shadow-md transition-shadow">
                        <div className="space-y-1.5">
                            <div className="flex items-start sm:items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-dark-bg text-sm leading-snug">{form.title}</h4>
                                {form.confidence === "high" && (
                                    <span className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                        High
                                    </span>
                                )}
                                {form.confidence === "medium" && (
                                    <span className="text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-400 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                        Med
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {form.description}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-center px-4">
                <p className="text-xs text-gray-400 italic text-center">
                    * Suggestions are AI-generated based on public payer data. Verify requirements before submission.
                </p>
            </div>
        </div>
    )
}
