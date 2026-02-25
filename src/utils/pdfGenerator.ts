import { jsPDF } from 'jspdf';
import { BadgeTemplate, BatchRecord } from '../types';
import { renderBadgeToCanvas } from './canvasRenderer';

/**
 * Generates a PDF from a template and a list of records.
 * Each badge (front and back) will be a separate page in the PDF.
 */
export async function generateBadgesPDF(
    template: BadgeTemplate,
    records: BatchRecord[],
    onProgress?: (progress: number) => void
): Promise<void> {
    if (records.length === 0) return;

    const isVertical = template.orientation === 'vertical';
    // CR80 dimensions in mm
    const docWidth = isVertical ? 54 : 85.6;
    const docHeight = isVertical ? 85.6 : 54;

    const doc = new jsPDF({
        orientation: isVertical ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [docWidth, docHeight]
    });

    for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // Front Side
        const frontCanvas = await renderBadgeToCanvas(template, record, { side: 'front', includeBleed: true });
        const frontData = frontCanvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) doc.addPage([docWidth, docHeight], isVertical ? 'portrait' : 'landscape');
        doc.addImage(frontData, 'JPEG', 0, 0, docWidth, docHeight);

        // Back Side - Rotated 180 for Zebra ZC300
        const backCanvas = await renderBadgeToCanvas(template, record, {
            side: 'back',
            includeBleed: true,
            rotate180: true
        });
        const backData = backCanvas.toDataURL('image/jpeg', 0.95);

        doc.addPage([docWidth, docHeight], isVertical ? 'portrait' : 'landscape');
        doc.addImage(backData, 'JPEG', 0, 0, docWidth, docHeight);

        if (onProgress) {
            onProgress(Math.round(((i + 1) / records.length) * 100));
        }
    }

    doc.save(`${template.name}_crachas.pdf`);
}
