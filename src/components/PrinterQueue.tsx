import { useState } from 'react'
import {
    Printer,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Rotate3d
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { BadgeTemplate, BatchRecord } from '../types'
import { renderBadgeToCanvas } from '../utils/canvasRenderer'
import BadgeDesigner from './BadgeDesigner'

interface PrinterQueueProps {
    template: BadgeTemplate;
    records: BatchRecord[];
    onUpdateTemplate?: (template: BadgeTemplate) => void;
}

export default function PrinterQueue({ template, records, onUpdateTemplate }: PrinterQueueProps) {
    const [generatedPairs, setGeneratedPairs] = useState<{ front: string; back: string }[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [showBack, setShowBack] = useState(false)

    const isVertical = template.orientation === 'vertical'

    const generateAll = async () => {
        if (records.length === 0) return
        setIsGenerating(true)
        setProgress(0)
        const pairs: { front: string; back: string }[] = []

        try {
            for (let i = 0; i < records.length; i++) {
                // Front Side
                const frontCanvas = await renderBadgeToCanvas(template, records[i], {
                    side: 'front',
                    includeBleed: false // Final print must have exact dimensions (CR80)
                })

                // Back Side - Rotated 180 for Zebra ZC300
                const backCanvas = await renderBadgeToCanvas(template, records[i], {
                    side: 'back',
                    includeBleed: false,
                    rotate180: true
                })

                pairs.push({
                    front: frontCanvas.toDataURL('image/png', 1.0),
                    back: backCanvas.toDataURL('image/png', 1.0)
                })
                setProgress(Math.round(((i + 1) / records.length) * 100))
            }
            setGeneratedPairs(pairs)
            setCurrentIndex(0)
        } catch (error) {
            console.error('Error generating badges:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            alert('Bloqueador de popups detectado! Por favor, autorize popups para este site para poder imprimir.')
            return
        }

        const printWidth = isVertical ? '54mm' : '85.6mm'
        const printHeight = isVertical ? '85.6mm' : '54mm'

        printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Crachás - Zebra ZC300</title>
          <style>
            @page {
              size: ${printWidth} ${printHeight};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            img {
              width: ${printWidth};
              height: ${printHeight};
              display: block;
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          ${generatedPairs.map(pair => `
            <img src="${pair.front}" />
            <img src="${pair.back}" />
          `).join('')}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
        printWindow.document.close()
    }

    const nextBadge = () => {
        setCurrentIndex((prev) => (prev + 1) % generatedPairs.length)
        setShowBack(false)
    }

    const prevBadge = () => {
        setCurrentIndex((prev) => (prev - 1 + generatedPairs.length) % generatedPairs.length)
        setShowBack(false)
    }

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1rem', height: '100%', overflow: 'hidden' }}>
            {/* Header Control Panel - Only show if not generated yet */}
            {generatedPairs.length === 0 && (
                <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '1.5rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--panel-shadow)',
                    textAlign: 'center',
                    flexShrink: 0
                }}>
                    {records.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', padding: '1rem' }}>
                            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.2, color: 'var(--accent-color)' }} />
                            <h2 style={{ color: '#1e293b', fontWeight: 900, marginBottom: '0.5rem', fontSize: '1.2rem' }}>Fila Vazia</h2>
                            <p style={{ fontSize: '0.9rem' }}>Nenhum dado disponível para impressão.<br />Importe um arquivo Excel ou CSV na aba "Dados" primeiro.</p>
                        </div>
                    ) : (
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>Preparar Impressão</h2>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '1rem' }}>
                                {records.length} registros prontos para processamento.<br />
                                A impressão será enviada em alta resolução (300 DPI).
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={generateAll}
                                disabled={isGenerating}
                                style={{
                                    margin: '0 auto',
                                    padding: '0.8rem 2rem',
                                    height: 'auto',
                                    borderRadius: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 800
                                }}
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                                {isGenerating ? `Gerando Crachás... ${progress}%` : 'Iniciar Processamento de Impressão'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Action Menu (Bottom Right) - Using Portal to escape parent constraints */}
            {generatedPairs.length > 0 && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            right: '2rem',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '2rem',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <button
                            className="nav-bubble active"
                            onClick={handlePrint}
                            data-tooltip="Imprimir Tudo"
                            style={{ width: '60px', height: '60px', borderRadius: '1.8rem', position: 'relative' }}
                        >
                            <Printer size={28} />
                        </button>

                        <button
                            className="nav-bubble"
                            onClick={() => setShowBack(!showBack)}
                            data-tooltip={showBack ? "Ver Frente" : "Ver Verso"}
                            style={{ width: '60px', height: '60px', borderRadius: '1.8rem', background: 'white', border: '1px solid #e2e8f0', color: 'var(--accent-color)', position: 'relative' }}
                        >
                            <Rotate3d size={24} />
                        </button>

                        <button
                            className="nav-bubble"
                            onClick={() => {
                                setGeneratedPairs([])
                                setCurrentIndex(0)
                            }}
                            data-tooltip="Limpar / Outro Lote"
                            style={{ width: '60px', height: '60px', borderRadius: '1.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', position: 'relative' }}
                        >
                            <RefreshCw size={24} />
                        </button>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Individual Carousel Preview */}
            {generatedPairs.length > 0 && (
                <div style={{
                    width: '100%',
                    maxWidth: '1000px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0 1rem',
                        flexShrink: 0
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                Visualização de Pré-impressão <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem' }}>({generatedPairs.length} Crachás)</span>
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Exibindo crachá {currentIndex + 1} de {generatedPairs.length}</p>
                        </div>

                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        width: '100%',
                        justifyContent: 'center',
                        flex: 1,
                        minHeight: 0 // Crucial for nested flex with overflow
                    }}>
                        <button
                            className="nav-btn"
                            onClick={prevBadge}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'white',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                        >
                            <ChevronLeft size={28} />
                        </button>

                        <div style={{
                            position: 'relative',
                            height: '100%',
                            width: '100%',
                            maxWidth: isVertical ? '450px' : '750px',
                            maxHeight: '80vh',
                            backgroundColor: 'transparent',
                            borderRadius: '1.25rem',
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BadgeDesigner
                                    key={currentIndex}
                                    template={template}
                                    onUpdate={async (updated) => {
                                        // Update the parent template if setter provided
                                        onUpdateTemplate?.(updated);

                                        // Update all generated pairs with the new template positions
                                        const newPairs = [...generatedPairs];
                                        for (let i = 0; i < records.length; i++) {
                                            const frontCanvas = await renderBadgeToCanvas(updated, records[i], {
                                                side: 'front',
                                                includeBleed: false
                                            });
                                            const backCanvas = await renderBadgeToCanvas(updated, records[i], {
                                                side: 'back',
                                                includeBleed: false,
                                                rotate180: true
                                            });
                                            newPairs[i] = {
                                                front: frontCanvas.toDataURL('image/png', 1.0),
                                                back: backCanvas.toDataURL('image/png', 1.0)
                                            };
                                        }
                                        setGeneratedPairs(newPairs);
                                    }}
                                    availableColumns={records[0] ? Object.keys(records[0].data) : []}
                                    minimal={true}
                                    side={showBack ? 'back' : 'front'}
                                    record={records[currentIndex]}
                                />
                            </div>
                        </div>

                        <button
                            className="nav-btn"
                            onClick={nextBadge}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'white',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                        >
                            <ChevronRight size={28} />
                        </button>
                    </div>

                    {/* Thumbnails Strip */}
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        padding: '1rem',
                        overflowX: 'auto',
                        width: '100%',
                        justifyContent: generatedPairs.length < 8 ? 'center' : 'flex-start',
                        flexShrink: 0
                    }}>
                        {generatedPairs.map((pair, i) => (
                            <div
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                style={{
                                    width: '50px',
                                    height: isVertical ? '80px' : '32px',
                                    borderRadius: '0.4rem',
                                    overflow: 'hidden',
                                    border: `2px solid ${currentIndex === i ? 'var(--accent-color)' : 'transparent'}`,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.2s',
                                    opacity: currentIndex === i ? 1 : 0.6
                                }}
                            >
                                <img src={pair.front} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Mini" />
                            </div>
                        ))}
                    </div>
                </div >
            )
            }

            <style>{`
                .nav-btn:hover {
                    transform: scale(1.1);
                    color: var(--accent-color);
                    border-color: var(--accent-color);
                    background: #f8fafc;
                }
                .nav-btn:active {
                    transform: scale(0.95);
                }
                .nav-btn:active {
                    transform: scale(0.95);
                }
            `}</style>
        </div >
    )
}
