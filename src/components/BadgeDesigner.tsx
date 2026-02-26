import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Upload,
    Type,
    Trash2,
    User,
    RefreshCw,
    Rotate3d,
    X,
    Square,
    Circle,
    ZoomIn,
    ZoomOut,
    Image as ImageIcon,
    Minus,
    Triangle,
    Layout,
    Globe,
    Lock as LockIcon
} from 'lucide-react'
import { BadgeTemplate, BadgeLayer, BatchRecord } from '../types'
import { templateService } from '../services/api'

const DESIGNER_STYLES = `
  .workspace {
    perspective: 1000px;
    background: #f8fafc;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: auto;
    padding: 3rem;
    padding-left: 10rem;
    padding-bottom: 8rem;
  }
  .scene {
    position: relative;
    transform-style: preserve-3d;
  }
  .card {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card.is-flipped {
    transform: rotateY(180deg);
  }
  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    background: white;
    border-radius: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 20px 25px -5px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05);
    overflow: hidden;
  }
  .card-face-back {
    transform: rotateY(180deg);
  }
  .resizer {
    width: 10px;
    height: 10px;
    background: white;
    border: 1px solid var(--accent-color);
    position: absolute;
    z-index: 100;
    border-radius: 50%;
  }
  .resizer.nw { top: -5px; left: -5px; cursor: nw-resize; }
  .resizer.ne { top: -5px; right: -5px; cursor: ne-resize; }
  .resizer.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
  .resizer.se { bottom: -5px; right: -5px; cursor: se-resize; }

  .layer-handle.selected {
    outline: 2px solid var(--accent-color);
    outline-offset: 4px;
    z-index: 50;
  }

  .tools-panel {
    width: 72px;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 0;
    gap: 0.5rem;
    margin: 0 1.5rem;
    height: 600px;
    z-index: 60;
  }

  .props-panel {
    width: 320px;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    margin: 0 1.5rem;
    height: 600px;
    overflow-y: auto;
    z-index: 60;
  }

  .nav-bubble {
    width: 48px;
    height: 48px;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .nav-bubble:hover {
    background: #f1f5f9;
    color: var(--accent-color);
  }

  .nav-bubble.active, .nav-bubble:active {
    background: var(--accent-color);
    color: white;
  }

  .alignment-guide {
    position: absolute;
    pointer-events: none;
    z-index: 1000;
  }
  .alignment-guide.v { width: 1px; height: 100%; top: 0; border-left: 1px dashed var(--accent-color); }
  .alignment-guide.h { height: 1px; width: 100%; left: 0; border-top: 1px dashed var(--accent-color); }
`;

interface BadgeDesignerProps {
    template: BadgeTemplate;
    onUpdate: (template: BadgeTemplate) => void;
    availableColumns: string[];
    minimal?: boolean;
    side?: 'front' | 'back';
    record?: BatchRecord;
}

export default function BadgeDesigner({
    template,
    onUpdate,
    availableColumns,
    minimal = false,
    side,
    record
}: BadgeDesignerProps) {
    const [activeSide, setActiveSide] = useState<'front' | 'back'>(side || 'front')
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

    // Sync activeSide if side prop changes
    useEffect(() => {
        if (side && side !== activeSide) {
            setActiveSide(side);
        }
    }, [side]);
    const [isFlipped, setIsFlipped] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeHandle, setResizeHandle] = useState<string | null>(null)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, layerX: 0, layerY: 0, layerW: 0, layerH: 0 })
    const [userZoom, setUserZoom] = useState(1.0)
    const [uploadMode, setUploadMode] = useState<'background' | 'image'>('background')
    const [showGuidance, setShowGuidance] = useState(false)
    const [activeGuides, setActiveGuides] = useState<{ type: 'v' | 'h', pos: number }[]>([])
    const [layerDimensions, setLayerDimensions] = useState<{ [id: string]: { w: number, h: number } }>({})

    const fileInputRef = useRef<HTMLInputElement>(null)
    const sceneRef = useRef<HTMLDivElement>(null)

    const sideData = template[activeSide]
    const selectedLayer = sideData.layers.find(l => l.id === selectedLayerId)

    const isVertical = template.orientation === 'vertical'
    const baseWidth = isVertical ? 638 : 1011
    const baseHeight = isVertical ? 1011 : 638

    // Scale to fit viewport comfortably * User Zoom - Larger in minimal mode
    const targetDim = minimal
        ? Math.min(window.innerHeight * 0.75, window.innerWidth * 0.9)
        : Math.min(window.innerHeight * 0.6, window.innerWidth * 0.4)
    const baseScale = isVertical ? targetDim / baseHeight : targetDim / baseWidth
    const scale = baseScale * userZoom

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        try {
            const res = await templateService.uploadImage(formData)
            const fileName = res.data.fileName

            if (uploadMode === 'background') {
                onUpdate({
                    ...template,
                    [activeSide]: { ...template[activeSide], background: fileName }
                })
            } else {
                addLayer('image', fileName)
            }
        } catch (error) {
            console.error('Error uploading image:', error)
        }
    }

    const addLayer = (type: 'text' | 'photo' | 'image' | 'square' | 'circle' | 'line' | 'triangle', content: string = '') => {
        const id = Math.random().toString(36).substr(2, 9)
        let newLayer: BadgeLayer;

        switch (type) {
            case 'text':
                newLayer = { id, type, content: 'Novo Texto', x: 50, y: 50, fontSize: 32, color: '#1e293b', fontFamily: 'Outfit', fontWeight: 'bold' };
                break;
            case 'photo':
                newLayer = { id, type, content: '', x: 50, y: 50, width: 150, height: 180, fontSize: 0, color: '', fontFamily: '', fontWeight: '', mapping: 'Foto', shape: 'rect' };
                break;
            case 'image':
                newLayer = { id, type, content: content || '', x: 50, y: 50, width: 200, height: 200, fontSize: 0, color: '', fontFamily: '', fontWeight: '' };
                break;
            case 'square':
                newLayer = { id, type, content: '', x: 50, y: 50, width: 100, height: 100, fontSize: 0, color: '#6366f1', fontFamily: '', fontWeight: '', hasFill: true, borderColor: '#000000', borderWidth: 0 };
                break;
            case 'circle':
                newLayer = { id, type, content: '', x: 50, y: 50, width: 100, height: 100, fontSize: 0, color: '#ef4444', fontFamily: '', fontWeight: '', hasFill: true, borderColor: '#000000', borderWidth: 0 };
                break;
            case 'line':
                newLayer = { id, type, content: '', x: 50, y: 50, width: 200, height: 0, fontSize: 0, color: '#000000', fontFamily: '', fontWeight: '', borderWidth: 2, borderColor: '#000000' };
                break;
            case 'triangle':
                newLayer = { id, type, content: '', x: 50, y: 50, width: 100, height: 100, fontSize: 0, color: '#f59e0b', fontFamily: '', fontWeight: '', hasFill: true, borderColor: '#000000', borderWidth: 0 };
                break;
        }

        onUpdate({
            ...template,
            [activeSide]: { ...sideData, layers: [...sideData.layers, newLayer] }
        })
        setSelectedLayerId(id)
    }

    const deleteLayer = (id: string) => {
        onUpdate({
            ...template,
            [activeSide]: { ...sideData, layers: sideData.layers.filter(l => l.id !== id) }
        })
        setSelectedLayerId(null)
    }

    const moveLayer = (id: string, direction: 'up' | 'down') => {
        const layers = [...sideData.layers]
        const idx = layers.findIndex(l => l.id === id)
        if (idx === -1) return

        const newLayers = [...layers]
        if (direction === 'up' && idx < layers.length - 1) {
            [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]]
        } else if (direction === 'down' && idx > 0) {
            [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]]
        }

        onUpdate({
            ...template,
            [activeSide]: { ...sideData, layers: newLayers }
        })
    }
    const updateLayer = (id: string, updates: Partial<BadgeLayer>) => {
        onUpdate({
            ...template,
            [activeSide]: {
                ...sideData,
                layers: sideData.layers.map(l => l.id === id ? { ...l, ...updates } : l)
            }
        })
    }

    const handleFlip = () => {
        setIsFlipped(!isFlipped)
        setSelectedLayerId(null)
        setTimeout(() => setActiveSide(activeSide === 'front' ? 'back' : 'front'), 300)
    }

    // Drag and Drop Logic
    const onMouseDown = (e: React.MouseEvent, layer: BadgeLayer, side: 'front' | 'back') => {
        if (side !== activeSide) return
        e.stopPropagation()
        setSelectedLayerId(layer.id)
        setIsDragging(true)
        setIsResizing(false)
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            layerX: layer.x,
            layerY: layer.y,
            layerW: layer.width || 0,
            layerH: layer.height || 0
        })
    }

    const onResizeStart = (e: React.MouseEvent, layer: BadgeLayer, handle: string) => {
        e.stopPropagation()
        setIsResizing(true)
        setIsDragging(false)
        setResizeHandle(handle)
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            layerX: layer.x,
            layerY: layer.y,
            layerW: layer.width || 0,
            layerH: layer.height || 0
        })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!selectedLayerId) return

            if (isDragging) {
                const dx = (e.clientX - dragStart.x) / scale
                const dy = (e.clientY - dragStart.y) / scale

                let nextX = Math.round(dragStart.layerX + dx)
                let nextY = Math.round(dragStart.layerY + dy)

                // Snapping logic
                const snapThreshold = 10 / scale
                const guides: { type: 'v' | 'h', pos: number }[] = []

                const dims = layerDimensions[selectedLayerId] || { w: selectedLayer?.width || 0, h: selectedLayer?.height || 0 }
                const layerWidth = dims.w
                const layerHeight = dims.h

                // Targets for Vertical Snapping (X axis)
                const vTargets = new Set([0, baseWidth / 2, baseWidth])
                // Targets for Horizontal Snapping (Y axis)
                const hTargets = new Set([0, baseHeight / 2, baseHeight])

                // Add other objects as targets
                sideData.layers.forEach(l => {
                    if (l.id === selectedLayerId) return
                    const lDims = layerDimensions[l.id] || { w: l.width || 0, h: l.height || 0 }
                    const lW = lDims.w
                    const lH = lDims.h

                    // Vertical targets (X)
                    vTargets.add(l.x)
                    vTargets.add(l.x + lW / 2)
                    vTargets.add(l.x + lW)

                    // Horizontal targets (Y)
                    hTargets.add(l.y)
                    hTargets.add(l.y + lH / 2)
                    hTargets.add(l.y + lH)
                })

                // Snap X
                const xSnaps = [nextX, nextX + layerWidth / 2, nextX + layerWidth]
                let snappedX = false
                for (const target of Array.from(vTargets)) {
                    for (const snapPoint of xSnaps) {
                        if (Math.abs(snapPoint - target) < snapThreshold) {
                            if (snapPoint === nextX) nextX = target
                            else if (snapPoint === nextX + layerWidth / 2) nextX = target - layerWidth / 2
                            else nextX = target - layerWidth
                            guides.push({ type: 'v', pos: target })
                            snappedX = true
                            break
                        }
                    }
                    if (snappedX) break
                }

                // Snap Y
                const ySnaps = [nextY, nextY + layerHeight / 2, nextY + layerHeight]
                let snappedY = false
                for (const target of Array.from(hTargets)) {
                    for (const snapPoint of ySnaps) {
                        if (Math.abs(snapPoint - target) < snapThreshold) {
                            if (snapPoint === nextY) nextY = target
                            else if (snapPoint === nextY + layerHeight / 2) nextY = target - layerHeight / 2
                            else nextY = target - layerHeight
                            guides.push({ type: 'h', pos: target })
                            snappedY = true
                            break
                        }
                    }
                    if (snappedY) break
                }

                setActiveGuides(guides)
                updateLayer(selectedLayerId, { x: nextX, y: nextY })
            } else if (isResizing && resizeHandle) {
                const dx = (e.clientX - dragStart.x) / scale
                const dy = (e.clientY - dragStart.y) / scale
                const updates: Partial<BadgeLayer> = {}

                if (resizeHandle.includes('e')) updates.width = Math.max(20, Math.round(dragStart.layerW + dx))
                if (resizeHandle.includes('s')) updates.height = Math.max(20, Math.round(dragStart.layerH + dy))
                if (resizeHandle.includes('w')) {
                    const newWidth = Math.max(20, Math.round(dragStart.layerW - dx))
                    updates.width = newWidth
                    updates.x = Math.round(dragStart.layerX + (dragStart.layerW - newWidth))
                }
                if (resizeHandle.includes('n')) {
                    const newHeight = Math.max(20, Math.round(dragStart.layerH - dy))
                    updates.height = newHeight
                    updates.y = Math.round(dragStart.layerY + (dragStart.layerH - newHeight))
                }
                updateLayer(selectedLayerId, updates)
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            setIsResizing(false)
            setResizeHandle(null)
            setActiveGuides([])
        }

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, isResizing, dragStart, selectedLayerId, scale, resizeHandle, baseWidth, baseHeight, selectedLayer])

    // Keyboard Fine-tuning
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedLayerId || isDragging || isResizing) return
            // Don't move if typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

            const step = e.shiftKey ? 10 : 1
            const updates: Partial<BadgeLayer> = {}

            if (e.key === 'ArrowLeft') updates.x = (selectedLayer?.x || 0) - step
            else if (e.key === 'ArrowRight') updates.x = (selectedLayer?.x || 0) + step
            else if (e.key === 'ArrowUp') updates.y = (selectedLayer?.y || 0) - step
            else if (e.key === 'ArrowDown') updates.y = (selectedLayer?.y || 0) + step
            else return

            e.preventDefault()
            updateLayer(selectedLayerId, updates)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedLayerId, selectedLayer, isDragging, isResizing])

    const renderSide = (side: 'front' | 'back') => {
        const data = template[side]

        const processText = (text: string) => {
            if (!record) return text;
            let processed = text;
            Object.entries(record.data).forEach(([key, value]) => {
                processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
            });
            return processed;
        };

        return (
            <div className="badge-frame" style={{
                width: baseWidth,
                height: baseHeight,
                boxShadow: minimal ? 'none' : '0 10px 30px -5px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {data.background && (
                    <img src={data.background} style={{ width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' }} alt="" />
                )}
                {data.layers.map(layer => (
                    <div
                        key={layer.id}
                        ref={(el) => {
                            if (el) {
                                const rect = el.getBoundingClientRect()
                                const w = rect.width / scale
                                const h = rect.height / scale
                                if (Math.abs((layerDimensions[layer.id]?.w || 0) - w) > 0.1 || Math.abs((layerDimensions[layer.id]?.h || 0) - h) > 0.1) {
                                    setLayerDimensions(prev => ({
                                        ...prev,
                                        [layer.id]: { w, h }
                                    }))
                                }
                            }
                        }}
                        onMouseDown={(e) => onMouseDown(e, layer, side)}
                        className={`layer-handle ${selectedLayerId === layer.id ? 'selected' : ''}`}
                        style={{
                            position: 'absolute',
                            left: layer.x,
                            top: layer.y,
                            width: (layer.type !== 'text') ? layer.width : 'auto',
                            height: (layer.type !== 'text') ? layer.height : 'auto',
                            fontSize: `${layer.fontSize}px`,
                            color: layer.color,
                            fontFamily: layer.fontFamily,
                            fontWeight: layer.fontWeight,
                            outline: (selectedLayerId === layer.id && activeSide === side) ? '2px solid var(--accent-color)' : 'none',
                            outlineOffset: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: (layer.type === 'square' || layer.type === 'circle' || layer.type === 'triangle') && (layer.hasFill !== false) ? layer.color :
                                (layer.type === 'line') ? (layer.borderColor || layer.color) :
                                    layer.type === 'photo' ? '#f1f5f9' : 'transparent',
                            borderRadius: (layer.type === 'circle' || layer.shape === 'circle') ? '50%' : (layer.shape === 'oval' ? '100% / 100%' : (layer.borderRadius ? `${layer.borderRadius}px` : '0')),
                            border: (layer.type !== 'line' && layer.borderWidth && layer.borderWidth > 0) ? `${layer.borderWidth / scale}px solid ${layer.borderColor || '#000000'}` : 'none',
                            clipPath: layer.type === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                                layer.shape === 'oval' ? 'ellipse(50% 50% at 50% 50%)' : 'none',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            cursor: 'move',
                            transform: `rotate(${layer.rotation || 0}deg)`
                        }}
                    >
                        {layer.type === 'text' && (
                            <span>{processText(layer.content)}</span>
                        )}
                        {layer.type === 'photo' && (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {record?.data[layer.mapping || ''] ? (
                                    <img
                                        src={record.data[layer.mapping || '']}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        alt=""
                                    />
                                ) : (
                                    <div style={{ color: 'var(--accent-color)', textAlign: 'center' }}>
                                        <User size={isVertical ? 48 : 32} />
                                        <p style={{ fontSize: '10px' }}>{layer.mapping || 'Foto'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {layer.type === 'image' && (
                            layer.content ? <img src={layer.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> :
                                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    <Upload size={24} />
                                    <p style={{ fontSize: '10px' }}>Imagem</p>
                                </div>
                        )}

                        {/* Resize Handles - Hidden in minimal mode */}
                        {!minimal && selectedLayerId === layer.id && activeSide === side && (layer.type !== 'text') && (
                            <>
                                <div className="resizer nw" onMouseDown={(e) => onResizeStart(e, layer, 'nw')} />
                                <div className="resizer ne" onMouseDown={(e) => onResizeStart(e, layer, 'ne')} />
                                <div className="resizer sw" onMouseDown={(e) => onResizeStart(e, layer, 'sw')} />
                                <div className="resizer se" onMouseDown={(e) => onResizeStart(e, layer, 'se')} />
                            </>
                        )}
                    </div>
                ))}

                {/* Alignment Guides */}
                {activeGuides.map((guide, i) => (
                    <div
                        key={i}
                        className={`alignment-guide ${guide.type}`}
                        style={{
                            [guide.type === 'v' ? 'left' : 'top']: guide.pos
                        }}
                    />
                ))}
            </div>
        )
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            background: minimal ? 'transparent' : '#f8fafc',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <style>{DESIGNER_STYLES}</style>

            {/* Workspace */}
            <div className="workspace" style={{
                padding: minimal ? '0' : '3rem',
                paddingLeft: minimal ? '0' : '10rem',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent'
            }}>
                <div className="scene" ref={sceneRef} style={{ width: baseWidth * scale, height: baseHeight * scale }}>
                    <div className={`card ${isFlipped ? 'is-flipped' : ''}`}>
                        <div className="card-face card-face-front">
                            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                {renderSide('front')}
                            </div>
                        </div>
                        <div className="card-face card-face-back">
                            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                {renderSide('back')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Notch - Moved out of workspace for absolute positioning at bottom */}
            {!minimal && (
                <div className="zoom-controls">
                    <div className="side-label">
                        {activeSide === 'front' ? 'FRENTE' : 'VERSO'}
                    </div>
                    <button className="zoom-btn" onClick={handleFlip} data-tooltip="Trocar Lado (Frente/Verso)">
                        <Rotate3d size={20} />
                    </button>

                    <div style={{ width: '1px', background: 'var(--border-color)', height: '24px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="zoom-btn" onClick={() => setUserZoom(Math.max(0.5, userZoom - 0.1))} data-tooltip="Diminuir Zoom">
                            <ZoomOut size={18} />
                        </button>
                        <div className="zoom-val">{Math.round(userZoom * 100)}%</div>
                        <button className="zoom-btn" onClick={() => setUserZoom(Math.min(2.5, userZoom + 0.1))} data-tooltip="Aumentar Zoom">
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <div style={{ width: '1px', background: 'var(--border-color)', height: '24px' }} />

                    <button className="zoom-btn" onClick={() => onUpdate({ ...template, orientation: isVertical ? 'horizontal' : 'vertical' })} data-tooltip="Girar Orientação (Alt/Larg)">
                        <RefreshCw size={20} />
                    </button>
                </div>
            )}

            {/* Guidance Modal */}
            {!minimal && (
                <AnimatePresence>
                    {showGuidance && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(15, 23, 42, 0.4)',
                                zIndex: 2000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(8px)'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                style={{
                                    background: 'white',
                                    padding: '2.5rem',
                                    borderRadius: '2rem',
                                    maxWidth: '420px',
                                    width: '90%',
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                                    textAlign: 'center',
                                    border: '1px solid rgba(255,255,255,0.7)',
                                }}
                            >
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem',
                                    color: 'var(--accent-color)'
                                }}>
                                    <ImageIcon size={32} />
                                </div>

                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#1e293b' }}>
                                    Guia de Moldura
                                </h3>

                                <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    Para um ajuste perfeito, use uma imagem com estas dimensões:
                                </p>

                                <div style={{
                                    background: '#f8fafc',
                                    padding: '1.25rem',
                                    borderRadius: '1rem',
                                    border: '1px dashed #cbd5e1',
                                    marginBottom: '2rem'
                                }}>
                                    <span style={{
                                        display: 'block',
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: 'var(--accent-color)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {template.orientation === 'vertical' ? '638 x 1011 px' : '1011 x 638 px'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Padrão CR80 @ 300 DPI
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ flex: 1, height: '48px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => setShowGuidance(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{
                                            flex: 1,
                                            height: '48px',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, var(--accent-color) 0%, #4f46e5 100%)',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onClick={() => {
                                            setShowGuidance(false);
                                            setUploadMode('background');
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        OK
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Right Side Panels - Only if not minimal */}
            {!minimal && (
                <div className="props-panel">
                    {(() => {
                        const activeLayer = selectedLayer;
                        if (!activeLayer) return (
                            <div className="fade-in">
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Configurações do Modelo</h4>

                                    <label style={{ display: 'block', marginBottom: '1rem' }}>
                                        Nome do Crachá
                                        <input
                                            type="text"
                                            value={template.name}
                                            onChange={e => onUpdate({ ...template, name: e.target.value })}
                                            style={{ marginTop: '0.5rem', width: '100%' }}
                                        />
                                    </label>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        borderRadius: '1rem',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-color)'
                                    }} onClick={() => onUpdate({ ...template, isPublic: !template.isPublic })}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            background: template.isPublic ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                            borderRadius: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: template.isPublic ? '#22c55e' : '#64748b'
                                        }}>
                                            {template.isPublic ? <Globe size={20} /> : <LockIcon size={20} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                                {template.isPublic ? 'Modelo Público' : 'Modelo Privado'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {template.isPublic ? 'Todos os usuários podem ver' : 'Apenas você pode ver e usar'}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: '44px',
                                            height: '24px',
                                            background: template.isPublic ? 'var(--accent-color)' : '#cbd5e1',
                                            borderRadius: '12px',
                                            position: 'relative',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                background: 'white',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                top: '3px',
                                                left: template.isPublic ? '23px' : '3px',
                                                transition: 'all 0.3s',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#94a3b8', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
                                    <Layout size={40} style={{ margin: '0 auto 1.25rem', opacity: 0.2 }} />
                                    <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                        Selecione um elemento no crachá<br />para editar suas propriedades individuais.
                                    </p>
                                </div>
                            </div>
                        );

                        return (
                            <div className="fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Propriedades</h4>
                                    <button onClick={() => setSelectedLayerId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
                                </div>

                                {activeLayer.type === 'text' && (
                                    <>
                                        <label>Texto <input type="text" value={activeLayer.content} onChange={e => updateLayer(activeLayer.id, { content: e.target.value })} /></label>

                                        <label>Fonte
                                            <select
                                                value={activeLayer.fontFamily}
                                                onChange={e => updateLayer(activeLayer.id, { fontFamily: e.target.value })}
                                                style={{ marginTop: '0.5rem' }}
                                            >
                                                <optgroup label="Sans Serif (Modernas)">
                                                    <option value="Outfit">Outfit (Padrão)</option>
                                                    <option value="Inter">Inter</option>
                                                    <option value="Montserrat">Montserrat</option>
                                                    <option value="Poppins">Poppins</option>
                                                    <option value="Open Sans">Open Sans</option>
                                                    <option value="Lato">Lato</option>
                                                    <option value="Raleway">Raleway</option>
                                                    <option value="Ubuntu">Ubuntu</option>
                                                    <option value="Kanit">Kanit</option>
                                                </optgroup>
                                                <optgroup label="Serif (Clássicas)">
                                                    <option value="Playfair Display">Playfair Display</option>
                                                    <option value="Merriweather">Merriweather</option>
                                                    <option value="Lora">Lora</option>
                                                    <option value="Crimson Text">Crimson Text</option>
                                                    <option value="Noto Serif">Noto Serif</option>
                                                    <option value="Libre Baskerville">Libre Baskerville</option>
                                                    <option value="Georgia">Georgia</option>
                                                </optgroup>
                                                <optgroup label="Display (Destaque)">
                                                    <option value="Bebas Neue">Bebas Neue</option>
                                                    <option value="Oswald">Oswald</option>
                                                    <option value="Righteous">Righteous</option>
                                                    <option value="Concert One">Concert One</option>
                                                    <option value="Abril Fatface">Abril Fatface</option>
                                                    <option value="Cinzel">Cinzel</option>
                                                    <option value="Lobster">Lobster</option>
                                                </optgroup>
                                                <optgroup label="Handwriting (Escritas)">
                                                    <option value="Dancing Script">Dancing Script</option>
                                                    <option value="Pacifico">Pacifico</option>
                                                    <option value="Caveat">Caveat</option>
                                                    <option value="Shadows Into Light">Shadows Into Light</option>
                                                    <option value="Indie Flower">Indie Flower</option>
                                                </optgroup>
                                                <optgroup label="Monospace (Código)">
                                                    <option value="Roboto Mono">Roboto Mono</option>
                                                    <option value="Inconsolata">Inconsolata</option>
                                                    <option value="Source Code Pro">Source Code Pro</option>
                                                    <option value="PT Mono">PT Mono</option>
                                                </optgroup>
                                            </select>
                                        </label>

                                        <label>Peso
                                            <select
                                                value={activeLayer.fontWeight}
                                                onChange={e => updateLayer(activeLayer.id, { fontWeight: e.target.value })}
                                                style={{ marginTop: '0.5rem' }}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="600">Semi Bold</option>
                                                <option value="bold">Bold (700)</option>
                                                <option value="900">Black (900)</option>
                                            </select>
                                        </label>

                                        <label>Tags Dinâmicas</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {availableColumns.map(c => (
                                                <button
                                                    key={c}
                                                    className="btn btn-ghost"
                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                    onClick={() => updateLayer(activeLayer.id, { content: activeLayer.content + `{${c}}` })}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {(activeLayer.type === 'photo' || activeLayer.type === 'text') && (
                                    <label>Vincular ao CSV <select value={activeLayer.mapping || ''} onChange={e => updateLayer(activeLayer.id, { mapping: e.target.value || undefined })}>
                                        <option value="">Nenhum</option>
                                        {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select></label>
                                )}

                                {activeLayer.type === 'photo' && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label>Formato da Foto</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                className={`btn ${activeLayer.shape === 'rect' ? 'btn-primary' : 'btn-ghost'}`}
                                                style={{ flex: 1, fontSize: '0.7rem' }}
                                                onClick={() => updateLayer(activeLayer.id, { shape: 'rect', borderRadius: 0 })}
                                            >
                                                Retangular
                                            </button>
                                            <button
                                                className={`btn ${activeLayer.shape === 'circle' ? 'btn-primary' : 'btn-ghost'}`}
                                                style={{ flex: 1, fontSize: '0.7rem' }}
                                                onClick={() => updateLayer(activeLayer.id, { shape: 'circle', borderRadius: 0 })}
                                            >
                                                Circular
                                            </button>
                                            <button
                                                className={`btn ${activeLayer.shape === 'oval' ? 'btn-primary' : 'btn-ghost'}`}
                                                style={{ flex: 1, fontSize: '0.7rem' }}
                                                onClick={() => updateLayer(activeLayer.id, { shape: 'oval', borderRadius: 0, width: 200, height: 150 })}
                                            >
                                                Oval
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label style={{ margin: 0 }}>Rotação ({activeLayer.rotation || 0}°)</label>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                            onClick={() => updateLayer(activeLayer.id, { rotation: 0 })}
                                        >
                                            Resetar
                                        </button>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={activeLayer.rotation || 0}
                                        onChange={e => updateLayer(activeLayer.id, { rotation: parseInt(e.target.value) })}
                                        style={{ accentColor: 'var(--accent-color)', width: '100%', cursor: 'pointer' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Ajuste Milimétrico (Use as setas do teclado)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem' }}>X:</span>
                                            <input type="number" value={activeLayer.x} onChange={e => updateLayer(activeLayer.id, { x: parseInt(e.target.value) })} style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', fontSize: '0.8rem' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem' }}>Y:</span>
                                            <input type="number" value={activeLayer.y} onChange={e => updateLayer(activeLayer.id, { y: parseInt(e.target.value) })} style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', fontSize: '0.8rem' }} />
                                        </div>
                                    </div>
                                </div>

                                {activeLayer.type !== 'text' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem' }}>L:</span>
                                            <input type="number" value={activeLayer.width} onChange={e => updateLayer(activeLayer.id, { width: parseInt(e.target.value) })} style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', fontSize: '0.8rem' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem' }}>A:</span>
                                            <input type="number" value={activeLayer.height} onChange={e => updateLayer(activeLayer.id, { height: parseInt(e.target.value) })} style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', fontSize: '0.8rem' }} />
                                        </div>
                                    </div>
                                )}

                                {(activeLayer.type === 'text' || activeLayer.type === 'square' || activeLayer.type === 'circle' || activeLayer.type === 'triangle') && (
                                    <label>{'Cor de Preenchimento'}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="color" value={activeLayer.color} onChange={e => updateLayer(activeLayer.id, { color: e.target.value })} />
                                            {activeLayer.type !== 'text' && (
                                                <label style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input type="checkbox" checked={activeLayer.hasFill !== false} onChange={e => updateLayer(activeLayer.id, { hasFill: e.target.checked })} />
                                                    Preencher
                                                </label>
                                            )}
                                        </div>
                                    </label>
                                )}

                                {(activeLayer.type === 'square' || activeLayer.type === 'circle' || activeLayer.type === 'triangle' || activeLayer.type === 'line') && (
                                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                        <label>{activeLayer.type === 'line' ? 'Cor da Linha' : 'Cor da Borda'} <input type="color" value={activeLayer.borderColor || '#000000'} onChange={e => updateLayer(activeLayer.id, { borderColor: e.target.value })} /></label>
                                        <label>{activeLayer.type === 'line' ? 'Espessura da Linha' : 'Espessura da Borda'} <input type="number" value={activeLayer.borderWidth || 0} onChange={e => updateLayer(activeLayer.id, { borderWidth: parseInt(e.target.value) })} /></label>
                                    </div>
                                )}

                                {activeLayer.type === 'text' && (
                                    <label>Tamanho <input type="number" value={activeLayer.fontSize} onChange={e => updateLayer(activeLayer.id, { fontSize: parseInt(e.target.value) })} /></label>
                                )}

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.7rem' }} onClick={() => moveLayer(activeLayer.id, 'down')}>Recuar</button>
                                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.7rem' }} onClick={() => moveLayer(activeLayer.id, 'up')}>Avançar</button>
                                </div>

                                <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1.5rem', color: 'var(--danger)' }} onClick={() => deleteLayer(activeLayer.id)}>
                                    <Trash2 size={16} /> Excluir
                                </button>
                            </div>
                        );
                    })()}
                </div>
            )}

            {!minimal && (
                <div className="tools-panel">
                    <button className="nav-bubble" onClick={() => addLayer('text')} data-tooltip="Adicionar Texto">
                        <Type size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => addLayer('photo')} data-tooltip="Adicionar Foto (Vincular CSV)">
                        <User size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => { setUploadMode('image'); fileInputRef.current?.click(); }} data-tooltip="Imagem">
                        <ImageIcon size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => addLayer('square')} data-tooltip="Adicionar Quadrado">
                        <Square size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => addLayer('circle')} data-tooltip="Adicionar Círculo">
                        <Circle size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => addLayer('triangle')} data-tooltip="Adicionar Triângulo">
                        <Triangle size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => addLayer('line')} data-tooltip="Adicionar Linha">
                        <Minus size={20} />
                    </button>
                    <button className="nav-bubble" onClick={() => setShowGuidance(true)} data-tooltip="Trocar Fundo (Moldura)">
                        <Layout size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                </div>
            )}
        </div>
    )
}
