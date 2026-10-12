import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS, PRESETS, createWorld, stepWorld, summarize } from './sim';
import WorldView from './world';
import { MainChart, PhasePlot, TraitChart } from './charts';
const MODEL = 'muse-spark-1-3-high';
const SLIDERS = [
    { key: 'fruitGrowth', label: 'Fruit growth speed', min: 0.005, max: 0.16, step: 0.005, group: 'Fruit' },
    { key: 'fruitLimit', label: 'Fruit limit / tree', min: 1, max: 12, step: 1, group: 'Fruit' },
    { key: 'fruitDelay', label: 'Fruit return delay', min: 0, max: 120, step: 2, group: 'Fruit' },
    { key: 'blueDrain', label: 'Blue energy use', min: 0.02, max: 0.35, step: 0.01, group: 'Blue' },
    { key: 'blueSpeed', label: 'Blue speed', min: 0.15, max: 1.2, step: 0.02, group: 'Blue' },
    { key: 'blueVision', label: 'Blue vision', min: 15, max: 110, step: 1, group: 'Blue' },
    { key: 'blueRepro', label: 'Blue copy threshold', min: 45, max: 99, step: 1, group: 'Blue' },
    { key: 'blueEatTime', label: 'Blue eating time', min: 6, max: 60, step: 1, group: 'Blue' },
    { key: 'redDrain', label: 'Red energy use', min: 0.02, max: 0.35, step: 0.01, group: 'Red' },
    { key: 'redSpeed', label: 'Red speed', min: 0.15, max: 1.3, step: 0.02, group: 'Red' },
    { key: 'redVision', label: 'Red vision', min: 15, max: 120, step: 1, group: 'Red' },
    { key: 'redStrength', label: 'Red contact strength', min: 4, max: 40, step: 1, group: 'Red' },
    { key: 'redRepro', label: 'Red copy threshold', min: 45, max: 99, step: 1, group: 'Red' },
    { key: 'redPause', label: 'Red pause time', min: 4, max: 80, step: 1, group: 'Red' },
    { key: 'nTrees', label: 'Starting fruit trees', min: 1, max: 14, step: 1, group: 'World' },
    { key: 'nBlue', label: 'Starting blue blobs', min: 0, max: 40, step: 1, group: 'World' },
    { key: 'nRed', label: 'Starting red blobs', min: 0, max: 40, step: 1, group: 'World' },
    { key: 'worldSize', label: 'World size', min: 60, max: 160, step: 2, group: 'World' },
    { key: 'seed', label: 'Random seed', min: 1, max: 999, step: 1, group: 'World' },
    { key: 'simSpeed', label: 'Simulation speed', min: 1, max: 8, step: 1, group: 'World' },
];
export default function App() {
    const [params, setParams] = useState({ ...DEFAULTS });
    const [playing, setPlaying] = useState(true);
    const [angle, setAngle] = useState(0.6);
    const [selectedId, setSelectedId] = useState(null);
    const [version, setVersion] = useState(0);
    const [preset, setPreset] = useState('balanced garden');
    const worldRef = useRef(createWorld(DEFAULTS));
    const paramsRef = useRef(params);
    paramsRef.current = params;
    const playingRef = useRef(playing);
    playingRef.current = playing;
    useEffect(() => {
        document.title = MODEL;
    }, []);
    useEffect(() => {
        let raf = 0;
        const loop = () => {
            if (playingRef.current) {
                const w = worldRef.current;
                const live = paramsRef.current;
                w.params.fruitGrowth = live.fruitGrowth;
                w.params.fruitLimit = live.fruitLimit;
                w.params.fruitDelay = live.fruitDelay;
                w.params.blueDrain = live.blueDrain;
                w.params.blueSpeed = live.blueSpeed;
                w.params.blueVision = live.blueVision;
                w.params.blueRepro = live.blueRepro;
                w.params.blueEatTime = live.blueEatTime;
                w.params.redDrain = live.redDrain;
                w.params.redSpeed = live.redSpeed;
                w.params.redVision = live.redVision;
                w.params.redStrength = live.redStrength;
                w.params.redRepro = live.redRepro;
                w.params.redPause = live.redPause;
                w.params.worldSize = live.worldSize;
                w.params.simSpeed = live.simSpeed;
                w.params.seed = live.seed;
                for (let i = 0; i < live.simSpeed; i++)
                    stepWorld(w);
                setVersion((v) => v + 1);
            }
            raf = requestAnimationFrame(loop);
        };
        const id = setInterval(() => {
            if (!playingRef.current)
                return;
        }, 1000);
        raf = requestAnimationFrame(loop);
        const timer = setInterval(() => {
            if (playingRef.current)
                setVersion((v) => v + 1);
        }, 4000);
        return () => {
            cancelAnimationFrame(raf);
            clearInterval(timer);
            clearInterval(id);
        };
    }, []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                setPlaying((p) => !p);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    const w = worldRef.current;
    void version;
    const selected = useMemo(() => w.blobs.find((b) => b.id === selectedId) ?? null, [w.blobs, selectedId, version]);
    const reset = (p) => {
        worldRef.current = createWorld(p);
        setSelectedId(null);
        setVersion((v) => v + 1);
    };
    const applyPreset = (name) => {
        const pr = PRESETS.find((x) => x.name === name);
        if (!pr)
            return;
        const base = { ...DEFAULTS, ...pr.patch };
        base.seed = params.seed;
        base.simSpeed = params.simSpeed;
        setParams(base);
        setPreset(name);
        reset(base);
    };
    const randomize = () => {
        const r = (a, b) => a + Math.random() * (b - a);
        const np = {
            ...params,
            fruitGrowth: +r(0.02, 0.12).toFixed(3),
            fruitLimit: Math.round(r(3, 10)),
            fruitDelay: Math.round(r(15, 80)),
            blueDrain: +r(0.08, 0.2).toFixed(2),
            blueSpeed: +r(0.4, 0.75).toFixed(2),
            blueVision: Math.round(r(30, 70)),
            blueRepro: Math.round(r(65, 88)),
            blueEatTime: Math.round(r(14, 36)),
            redDrain: +r(0.08, 0.22).toFixed(2),
            redSpeed: +r(0.45, 0.8).toFixed(2),
            redVision: Math.round(r(40, 80)),
            redStrength: Math.round(r(12, 30)),
            redRepro: Math.round(r(70, 90)),
            redPause: Math.round(r(15, 45)),
            nTrees: Math.round(r(4, 10)),
            nBlue: Math.round(r(8, 20)),
            nRed: Math.round(r(3, 12)),
            seed: Math.round(r(1, 999)),
        };
        setParams(np);
        reset(np);
    };
    const step = () => {
        setPlaying(false);
        for (let i = 0; i < params.simSpeed; i++)
            stepWorld(worldRef.current);
        setVersion((v) => v + 1);
    };
    const blues = w.blobs.filter((b) => b.kind === 'blue').length;
    const reds = w.blobs.filter((b) => b.kind === 'red').length;
    const fruit = w.trees.reduce((a, t) => a + t.fruit, 0);
    const summary = summarize(w.history);
    const set = (k, v) => setParams((p) => ({ ...p, [k]: v }));
    const groups = ['Fruit', 'Blue', 'Red', 'World'];
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { children: [_jsx("h1", { children: MODEL }), _jsxs("p", { className: "sub", children: ["tick ", w.tick, " \u00B7 ", _jsx("span", { className: "dot blue" }), " ", blues, " blue \u00B7 ", _jsx("span", { className: "dot red" }), " ", reds, " red \u00B7", ' ', _jsx("span", { className: "dot green" }), " ", fruit.toFixed(0), " fruit ", playing ? '· playing' : '· paused'] })] }), _jsxs("div", { className: "transport", children: [_jsx("button", { onClick: () => setPlaying((p) => !p), className: playing ? 'warn' : 'go', children: playing ? 'pause' : 'play' }), _jsx("button", { onClick: step, children: "step" }), _jsx("button", { onClick: () => reset(params), children: "reset" }), _jsx("button", { onClick: randomize, children: "randomize" })] })] }), _jsx("div", { className: "presets", children: PRESETS.map((p) => (_jsx("button", { className: preset === p.name ? 'active' : '', onClick: () => applyPreset(p.name), title: p.desc, children: p.name }, p.name))) }), _jsxs("main", { className: "grid", children: [_jsxs("section", { className: "card worldCard", children: [_jsx(WorldView, { world: w, version: version, selectedId: selectedId, onSelect: (b) => setSelectedId(b ? b.id : null), angle: angle, onAngle: setAngle }), _jsx("div", { className: "inspector", children: selected ? (_jsxs("div", { className: "inspGrid", children: [_jsxs("div", { children: [_jsxs("strong", { children: [_jsx("span", { className: selected.kind === 'blue' ? 'dot blue' : 'dot red' }), " #", selected.id, " ", selected.kind] }), _jsxs("div", { children: ["action: ", selected.action] }), _jsxs("div", { children: ["gen ", selected.gen, selected.parent ? ` · child of #${selected.parent}` : ' · founder'] })] }), _jsxs("div", { children: [_jsx("div", { className: "ebar", children: _jsx("div", { className: "efill", style: { width: `${Math.max(0, Math.min(100, selected.energy))}%` } }) }), _jsxs("div", { children: ["energy ", selected.energy.toFixed(1), " / 100"] }), _jsxs("div", { children: ["age ", selected.age, " ticks"] })] }), _jsxs("div", { children: [_jsxs("div", { children: ["speed \u00D7", selected.speedTrait.toFixed(2)] }), _jsxs("div", { children: ["sensing ", ((selected.kind === 'blue' ? params.blueVision : params.redVision) * selected.visionTrait).toFixed(0), " px"] }), _jsx("div", { children: (selected.action === 'eat' || selected.action === 'pause' || selected.action === 'stagger') && selected.actionT > 0
                                                        ? `timer: ${selected.actionT} ticks left`
                                                        : 'timer: —' })] })] })) : (_jsx("div", { className: "hint", children: "Click a blob on the dish to inspect it \u2014 energy, age, action, traits, timers." })) }), _jsxs("div", { className: "legend", children: [_jsxs("span", { children: [_jsx("i", { className: "sw b" }), " blue eats fruit"] }), _jsxs("span", { children: [_jsx("i", { className: "sw r" }), " red sips blue energy on touch"] }), _jsxs("span", { children: [_jsx("i", { className: "sw g" }), " fruit regrows after a delay"] })] })] }), _jsxs("aside", { className: "card controls", children: [_jsx("h2", { children: "living toy controls" }), groups.map((g) => (_jsxs("div", { className: "group", children: [_jsx("h3", { children: g }), SLIDERS.filter((s) => s.group === g).map((s) => (_jsxs("label", { className: "slider", children: [_jsxs("span", { children: [s.label, " ", _jsx("b", { children: params[s.key] })] }), _jsx("input", { type: "range", min: s.min, max: s.max, step: s.step, value: params[s.key], onChange: (e) => set(s.key, +e.target.value) })] }, s.key)))] }, g)))] }), _jsxs("section", { className: "card charts", children: [_jsx("h2", { children: "garden story" }), _jsx(MainChart, { history: w.history }), _jsxs("div", { className: "two", children: [_jsxs("div", { children: [_jsx("h3", { children: "blue vs red phase" }), _jsx(PhasePlot, { history: w.history })] }), _jsxs("div", { children: [_jsx("h3", { children: "inherited traits" }), _jsx(TraitChart, { history: w.history })] })] }), _jsxs("div", { className: "summary", children: [_jsx("h3", { children: "run summary" }), _jsx("ul", { children: summary.map((s, i) => (_jsx("li", { children: s }, i))) }), _jsxs("p", { className: "stats", children: ["meals ", w.cumEaten, " \u00B7 contacts ", w.cumContacts, " \u00B7 born ", w.cumBirthsB + w.cumBirthsR, " \u00B7 faded", ' ', w.cumDeathsB + w.cumDeathsR] })] })] })] }), _jsx("footer", { children: "space = play/pause \u00B7 drag dish to spin \u00B7 every curve comes from the energy rules, nothing is scripted" })] }));
}
