// Small canvas line plots for the MD module (light background so they read in day and night mode).
export const COLORS = ['#2a6df4', '#e8590c', '#2b9348', '#9d4edd', '#c2255c'];
/** series: [{ x:[], y:[], color, label, dash }]; opts: xlabel, ylabel, xmin, xmax, ymin, ymax, vlines:[{x,label,color}], hlines:[{y,label,color}], shade:{x0,x1,color} */
export function linePlot(cv, series, o = {}) {
  const W = o.w || 620, H = o.h || 240, c = cv.getContext('2d'), L = 54, R = 14, T = 14, B = 38; cv.width = W; cv.height = H; cv.style.aspectRatio = `${W}/${H}`;
  const xs = series.flatMap(s => s.x), ys = series.flatMap(s => s.y.filter(Number.isFinite));
  const xmin = o.xmin ?? Math.min(...xs), xmax = o.xmax ?? Math.max(...xs), ymin = o.ymin ?? Math.min(0, ...ys), ymaxRaw = o.ymax ?? Math.max(...ys), ymax = o.ymax != null ? o.ymax : (ymaxRaw === ymin ? ymin + 1 : ymaxRaw * 1.05);
  const X = v => L + (v - xmin) / (xmax - xmin || 1) * (W - L - R), Y = v => H - B - (v - ymin) / (ymax - ymin || 1) * (H - B - T);
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.font = '12px sans-serif'; c.fillStyle = '#334'; c.strokeStyle = '#e3e7ef'; c.lineWidth = 1;
  const nt = 5; for (let i = 0; i <= nt; i++) { const v = ymin + (ymax - ymin) * i / nt; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(W - R, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(Math.abs(v) < 10 ? 1 : 0), L - 6, Y(v) + 4); }
  for (let i = 0; i <= 5; i++) { const v = xmin + (xmax - xmin) * i / 5; c.textAlign = 'center'; c.fillText(v.toFixed(xmax - xmin < 10 ? 1 : 0), X(v), H - B + 16); }
  c.textAlign = 'center'; c.fillText(o.xlabel || '', L + (W - L - R) / 2, H - 6); c.save(); c.translate(13, T + (H - B - T) / 2); c.rotate(-Math.PI / 2); c.fillText(o.ylabel || '', 0, 0); c.restore();
  if (o.shade) { c.fillStyle = o.shade.color || 'rgba(255,107,94,.15)'; c.fillRect(X(o.shade.x0), T, X(o.shade.x1) - X(o.shade.x0), H - B - T); }
  (o.hlines || []).forEach(l => { c.strokeStyle = l.color || '#c2255c'; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(L, Y(l.y)); c.lineTo(W - R, Y(l.y)); c.stroke(); c.setLineDash([]); c.fillStyle = l.color || '#c2255c'; c.textAlign = 'left'; c.fillText(l.label || '', L + 6, Y(l.y) - 4); });
  (o.vlines || []).forEach(l => { c.strokeStyle = l.color || '#555'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(l.x), T); c.lineTo(X(l.x), H - B); c.stroke(); c.setLineDash([]); c.fillStyle = l.color || '#555'; c.textAlign = 'left'; c.fillText(l.label || '', X(l.x) + 4, T + 12); });
  series.forEach((s, k) => { c.strokeStyle = s.color || COLORS[k % COLORS.length]; c.lineWidth = s.width || 1.6; c.setLineDash(s.dash || []); c.beginPath(); let pen = false; s.x.forEach((x, i) => { const y = s.y[i]; if (!Number.isFinite(y)) { pen = false; return; } pen ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); pen = true; }); c.stroke(); c.setLineDash([]); });
  let lx = L + 8, ly = T + 10; series.forEach((s, k) => { if (!s.label) return; c.fillStyle = s.color || COLORS[k % COLORS.length]; c.fillRect(lx, ly - 8, 14, 4); c.fillStyle = '#334'; c.textAlign = 'left'; c.fillText(s.label, lx + 18, ly - 3); lx += 30 + c.measureText(s.label).width; });
}
