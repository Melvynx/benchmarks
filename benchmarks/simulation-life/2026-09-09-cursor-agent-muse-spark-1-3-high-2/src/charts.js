import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export function MainChart({ history }) {
    const ref = useRef(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv)
            return;
        const ctx = cv.getContext('2d');
        if (!ctx)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = cv.getBoundingClientRect();
        cv.width = Math.max(300, r.width * dpr);
        cv.height = 220 * dpr;
        const W = cv.width;
        const H = cv.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        const pad = 34 * dpr;
        const iw = W - pad * 2;
        const ih = H - pad * 1.6;
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad * 0.6 + (ih * i) / 4;
            ctx.beginPath();
            ctx.moveTo(pad, y);
            ctx.lineTo(W - pad, y);
            ctx.stroke();
        }
        if (history.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = `${12 * dpr}px system-ui`;
            ctx.fillText('press play — history appears here', pad, H / 2);
            return;
        }
        const maxB = Math.max(4, ...history.map((h) => h.blue));
        const maxR = Math.max(4, ...history.map((h) => h.red));
        const maxF = Math.max(4, ...history.map((h) => h.fruit));
        const X = (i) => pad + (iw * i) / (history.length - 1);
        const Y = (v, m) => pad * 0.6 + ih - (ih * v) / m;
        const series = [
            { key: 'fruit', color: '#3d9950', max: maxF },
            { key: 'blue', color: '#2f6fe4', max: maxB },
            { key: 'red', color: '#e5484d', max: maxR },
        ];
        for (const s of series) {
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            history.forEach((h, i) => {
                const x = X(i);
                const y = Y(h[s.key], s.max);
                if (i === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
        ctx.font = `${10 * dpr}px system-ui`;
        ctx.fillStyle = '#3d9950';
        ctx.fillText(`fruit ≤${Math.round(maxF)}`, pad, H - 6);
        ctx.fillStyle = '#2f6fe4';
        ctx.fillText(`blue ≤${maxB}`, pad + 110 * dpr, H - 6);
        ctx.fillStyle = '#e5484d';
        ctx.fillText(`red ≤${maxR}`, pad + 210 * dpr, H - 6);
    });
    return _jsx("canvas", { ref: ref, className: "chartCanvas" });
}
export function PhasePlot({ history }) {
    const ref = useRef(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv)
            return;
        const ctx = cv.getContext('2d');
        if (!ctx)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = cv.getBoundingClientRect();
        cv.width = Math.max(200, r.width * dpr);
        cv.height = 190 * dpr;
        const W = cv.width;
        const H = cv.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        const pad = 30 * dpr;
        const maxB = Math.max(4, ...history.map((h) => h.blue));
        const maxR = Math.max(4, ...history.map((h) => h.red));
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(pad, 10, W - pad - 10, H - pad - 10);
        ctx.fillStyle = '#888';
        ctx.font = `${10 * dpr}px system-ui`;
        ctx.fillText('blue →', W / 2 - 20, H - 6);
        ctx.save();
        ctx.translate(10, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('red', -8, 0);
        ctx.restore();
        history.forEach((h, i) => {
            const k = i / Math.max(history.length - 1, 1);
            const x = pad + ((W - pad - 10) * h.blue) / maxB;
            const y = 10 + (H - pad - 10) * (1 - h.red / maxR);
            ctx.fillStyle = `rgba(124,92,255,${0.15 + k * 0.75})`;
            ctx.beginPath();
            ctx.arc(x, y, 2.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
        });
        if (history.length > 1) {
            const l = history[history.length - 1];
            const x = pad + ((W - pad - 10) * l.blue) / maxB;
            const y = 10 + (H - pad - 10) * (1 - l.red / maxR);
            ctx.fillStyle = '#e5484d';
            ctx.beginPath();
            ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    return _jsx("canvas", { ref: ref, className: "chartCanvas" });
}
export function TraitChart({ history }) {
    const ref = useRef(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv)
            return;
        const ctx = cv.getContext('2d');
        if (!ctx)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = cv.getBoundingClientRect();
        cv.width = Math.max(200, r.width * dpr);
        cv.height = 190 * dpr;
        const W = cv.width;
        const H = cv.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        const pad = 30 * dpr;
        if (history.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = `${11 * dpr}px system-ui`;
            ctx.fillText('traits appear as blobs breed', pad, H / 2);
            return;
        }
        const all = history.flatMap((h) => [h.avgBlueSpeed, h.avgRedSpeed, h.avgBlueVision, h.avgRedVision]);
        const lo = Math.min(0.7, ...all);
        const hi = Math.max(1.4, ...all);
        const X = (i) => pad + ((W - pad - 8) * i) / (history.length - 1);
        const Y = (v) => 12 + (H - pad - 12) * (1 - (v - lo) / (hi - lo));
        const lines = [
            { k: 'avgBlueSpeed', c: '#2f6fe4', dash: [] },
            { k: 'avgRedSpeed', c: '#e5484d', dash: [] },
            { k: 'avgBlueVision', c: '#7fb2ff', dash: [5, 4] },
            { k: 'avgRedVision', c: '#f0a0a0', dash: [5, 4] },
        ];
        for (const l of lines) {
            ctx.strokeStyle = l.c;
            ctx.setLineDash(l.dash.map((d) => d * dpr));
            ctx.lineWidth = 1.8 * dpr;
            ctx.beginPath();
            history.forEach((h, i) => {
                const v = h[l.k] || 1;
                if (i === 0)
                    ctx.moveTo(X(i), Y(v));
                else
                    ctx.lineTo(X(i), Y(v));
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.fillStyle = '#555';
        ctx.font = `${10 * dpr}px system-ui`;
        ctx.fillText('— speed', pad, H - 18);
        ctx.fillText('- - vision', pad + 70 * dpr, H - 18);
    });
    return _jsx("canvas", { ref: ref, className: "chartCanvas" });
}
