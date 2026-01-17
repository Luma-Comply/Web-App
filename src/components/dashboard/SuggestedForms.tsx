"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, ExternalLink, AlertCircle } from "lucide-react"

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

            // @ts-ignore
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-serif font-medium text-dark-bg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-mint-dark" />
                        Suggested Supporting Documents
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Based on payer policy research, these documents may increase approval odds.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadFormsPDF} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Checklist
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {forms.map((form) => (
                    <Card key={form.id} className="p-3 border-sage-medium/20 hover:border-mint/30 transition-colors bg-white/80">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-dark-bg text-sm truncate">{form.title}</h4>
                                    {form.confidence === "high" && (
                                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                            High
                                        </span>
                                    )}
                                    {form.confidence === "medium" && (
                                        <span className="text-[10px] font-semibold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                            Med
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 leading-snug">
                                    {form.description}
                                </p>
                            </div>

                            <div className="shrink-0">
                                {form.download_url ? (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-mint-dark hover:text-mint-dark hover:bg-mint/10 border-mint/20"
                                        onClick={() => window.open(form.download_url!, '_blank')}
                                        title={form.is_external ? "Open Link" : "Download"}
                                    >
                                        {form.is_external ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 cursor-not-allowed" disabled>
                                        <AlertCircle className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-center">
                <p className="text-xs text-gray-400 italic">
                    * Suggestions are AI-generated based on public payer data. Verify requirements before submission.
                </p>
            </div>
        </div>
    )
}
