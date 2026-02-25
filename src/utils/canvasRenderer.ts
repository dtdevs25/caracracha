import { BadgeTemplate, BatchRecord } from '../types';

/**
 * Renders a badge template with specific record data to a high-resolution canvas.
 * Optimized for 300 DPI (CR80 Standard).
 */
export async function renderBadgeToCanvas(
    template: BadgeTemplate,
    record?: BatchRecord,
    options: { side: 'front' | 'back'; includeBleed: boolean; rotate180?: boolean } = { side: 'front', includeBleed: true }
): Promise<HTMLCanvasElement> {
    const { side, includeBleed, rotate180 } = options;
    const sideData = template[side];

    // Dimensions @ 300 DPI
    const isVertical = template.orientation === 'vertical';
    const baseWidth = isVertical ? 638 : 1011;
    const baseHeight = isVertical ? 1011 : 638;

    // Fix: Ensure bleed is always numeric
    const bleed = includeBleed ? (template.bleed || 0) : 0;

    const width = baseWidth + (bleed * 2);
    const height = baseHeight + (bleed * 2);

    // Designer uses the same base dimensions (638x1011), so scale is 1:1
    const renderScale = 1.0;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    ctx.save();
    if (rotate180) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-width / 2, -height / 2);
    }

    // 1. Draw Background (Spans full canvas including bleed)
    if (sideData.background) {
        try {
            const bgImg = await loadImage(sideData.background);

            // Background "Cover" logic for the full canvas (including bleed)
            const imgRatio = bgImg.width / bgImg.height;
            const targetRatio = width / height;
            let sx, sy, sw, sh;

            if (imgRatio > targetRatio) {
                sw = bgImg.height * targetRatio;
                sh = bgImg.height;
                sx = (bgImg.width - sw) / 2;
                sy = 0;
            } else {
                sw = bgImg.width;
                sh = bgImg.width / targetRatio;
                sx = 0;
                sy = (bgImg.height - sh) / 2;
            }

            ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
        } catch (e) {
            console.warn('Failed to load background image:', sideData.background);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Setup Coordinate System & Global Clipping
    // Move origin to physical card corner (after bleed)
    ctx.translate(bleed, bleed);

    // Apply Clipping Mask (CR80 boundaries)
    ctx.beginPath();
    ctx.rect(0, 0, baseWidth, baseHeight);
    ctx.clip();

    // 2. Draw Layers
    for (const layer of sideData.layers) {
        if (layer.type === 'text') {
            let text = layer.content;

            // Use direct mapping if provided, otherwise use tags
            if (record && layer.mapping && record.data[layer.mapping]) {
                text = record.data[layer.mapping];
            } else if (record) {
                // Replace tags like {NOME} with record data
                Object.entries(record.data).forEach(([key, value]) => {
                    text = text.replace(new RegExp(`{${key}}`, 'g'), value);
                });
            }

            ctx.save();
            const lx = layer.x;
            const ly = layer.y;
            const fontSize = layer.fontSize;

            // 1. Set font first to measure correctly
            const fontStr = `${layer.fontWeight} ${fontSize}px "${layer.fontFamily}"`;
            ctx.font = fontStr;

            // 2. Handle Rotation
            if (layer.rotation) {
                const metrics = ctx.measureText(text);
                const tw = metrics.width;
                const th = fontSize * 0.8; // Use 0.8 for a better vertical center approximation
                ctx.translate(lx + tw / 2, ly + th / 2);
                ctx.rotate((layer.rotation * Math.PI) / 180);
                ctx.translate(-(lx + tw / 2), -(ly + th / 2));
            }

            ctx.fillStyle = layer.color;
            ctx.textBaseline = 'top';
            ctx.fillText(text, lx, ly);
            ctx.restore();
        } else if (layer.type === 'image' || layer.type === 'photo') {
            let src = layer.content;
            if (layer.type === 'photo' && layer.mapping && record && record.data[layer.mapping]) {
                src = record.data[layer.mapping];
            }

            if (src) {
                try {
                    const img = await loadImage(src);
                    ctx.save();
                    const lx = layer.x;
                    const ly = layer.y;
                    const lw = layer.width || 100;
                    const lh = layer.height || 100;

                    // Handle Rotation
                    if (layer.rotation) {
                        ctx.translate(lx + lw / 2, ly + lh / 2);
                        ctx.rotate((layer.rotation * Math.PI) / 180);
                        ctx.translate(-(lx + lw / 2), -(ly + lh / 2));
                    }

                    // 1. Shapes / Masking
                    if (layer.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
                        ctx.clip();
                    } else if (layer.shape === 'oval') {
                        ctx.beginPath();
                        ctx.ellipse(lx + lw / 2, ly + lh / 2, lw / 2, lh / 2, 0, 0, Math.PI * 2);
                        ctx.clip();
                    } else if (layer.borderRadius) {
                        const r = layer.borderRadius;
                        ctx.beginPath();
                        ctx.moveTo(lx + r, ly);
                        ctx.arcTo(lx + lw, ly, lx + lw, ly + lh, r);
                        ctx.arcTo(lx + lw, ly + lh, lx, ly + lh, r);
                        ctx.arcTo(lx, ly + lh, lx, ly, r);
                        ctx.arcTo(lx, ly, lx + lw, ly, r);
                        ctx.closePath();
                        ctx.clip();
                    }

                    // 2. Draw Image with "Cover" logic to avoid distortion
                    const imgRatio = img.width / img.height;
                    const targetRatio = lw / lh;
                    let sx, sy, sw, sh;

                    if (imgRatio > targetRatio) {
                        sw = img.height * targetRatio;
                        sh = img.height;
                        sx = (img.width - sw) / 2;
                        sy = 0;
                    } else {
                        sw = img.width;
                        sh = img.width / targetRatio;
                        sx = 0;
                        sy = (img.height - sh) / 2;
                    }

                    ctx.drawImage(img, sx, sy, sw, sh, lx, ly, lw, lh);

                    // 3. Draw border if needed
                    if (layer.borderWidth && layer.borderWidth > 0) {
                        const bw = layer.borderWidth * renderScale;
                        ctx.strokeStyle = layer.borderColor || '#000000';
                        ctx.lineWidth = bw;
                        if (layer.shape === 'circle') {
                            ctx.beginPath();
                            ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
                            ctx.stroke();
                        } else if (layer.shape === 'oval') {
                            ctx.beginPath();
                            ctx.ellipse(lx + lw / 2, ly + lh / 2, lw / 2, lh / 2, 0, 0, Math.PI * 2);
                            ctx.stroke();
                        } else {
                            ctx.strokeRect(lx, ly, lw, lh);
                        }
                    }
                    ctx.restore();
                } catch (e) {
                    console.warn('Failed to load layer image:', src);
                    ctx.fillStyle = '#ddd';
                    ctx.fillRect(layer.x * renderScale, layer.y * renderScale, (layer.width || 100) * renderScale, (layer.height || 100) * renderScale);
                }
            }
        } else if (layer.type === 'square' || layer.type === 'circle' || layer.type === 'triangle' || layer.type === 'line') {
            ctx.save();
            const x = layer.x;
            const y = layer.y;
            const w = layer.width || 100;
            const h = layer.height || 100;
            const borderWidth = layer.borderWidth || 0;
            const borderRadius = layer.borderRadius || 0;

            // Handle Rotation
            if (layer.rotation) {
                ctx.translate(x + w / 2, y + h / 2);
                ctx.rotate((layer.rotation * Math.PI) / 180);
                ctx.translate(-(x + w / 2), -(y + h / 2));
            }

            ctx.beginPath();
            if (layer.type === 'square') {
                if (borderRadius > 0) {
                    ctx.moveTo(x + borderRadius, y);
                    ctx.arcTo(x + w, y, x + w, y + h, borderRadius);
                    ctx.arcTo(x + w, y + h, x, y + h, borderRadius);
                    ctx.arcTo(x, y + h, x, y, borderRadius);
                    ctx.arcTo(x, y, x + w, y, borderRadius);
                } else {
                    ctx.rect(x, y, w, h);
                }
            } else if (layer.type === 'circle') {
                ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            } else if (layer.type === 'triangle') {
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
            } else if (layer.type === 'line') {
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y + h);
            }

            // Fill
            if (layer.type !== 'line' && (layer.hasFill !== false)) {
                ctx.fillStyle = layer.color;
                ctx.fill();
            }

            // Border
            if (borderWidth > 0) {
                ctx.strokeStyle = layer.borderColor || '#000000';
                ctx.lineWidth = borderWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            } else if (layer.type === 'line') {
                // Default style for line if no border defined
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    ctx.restore();
    return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Ensure CORS for data URLs/external images
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
