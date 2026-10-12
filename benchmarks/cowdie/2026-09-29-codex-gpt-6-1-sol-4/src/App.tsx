import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, Check, ChevronRight, CircleHelp, Droplets, Flower2, Heart, Leaf, Moon, Pencil, Plus, Settings2, Sparkles, Sprout, Sun, Volume2, VolumeX, X, Zap, Utensils, Gamepad2, CloudSun, CheckCheck } from 'lucide-react';
import { PetScene } from './PetScene';
import { FoodIcon } from './FoodIcon';
import { advanceNeeds, careForPet, foodInfo, loadPet, STORAGE_KEY } from './pet-state';
import type { CareAction, Food, Needs } from './pet-state';

type Tab = 'feed' | 'play' | 'clean' | 'sleep';
const careTabs = [ { id: 'feed', label: 'Feed', Icon: Utensils }, { id: 'play', label: 'Play', Icon: Gamepad2 },
  { id: 'clean', label: 'Freshen up', Icon: Droplets }, { id: 'sleep', label: 'Rest', Icon: Moon } ] as const;
const stats = [ { key: 'fullness', label: 'Fullness', Icon: Utensils, color: 'peach' },
  { key: 'happiness', label: 'Happiness', Icon: Heart, color: 'pink' },
  { key: 'energy', label: 'Energy', Icon: Zap, color: 'yellow' },
  { key: 'cleanliness', label: 'Cleanliness', Icon: Droplets, color: 'blue' } ] as const;

function CowMark() { return <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M12 15 4 12 6 21 13 23M32 15 40 12 38 21 31 23" fill="#e6dec5"/><path d="M15 13 13 7 18 10M29 13 31 7 26 10" fill="#efdbb5"/><rect x="12" y="10" width="20" height="28" rx="10" fill="#fff9eb"/><path d="M12 16C16 12 22 14 21 21C18 24 14 22 12 20" fill="#514e46"/><rect x="12" y="25" width="20" height="11" rx="5.5" fill="#dda99b"/><circle cx="17" cy="22" r="2" fill="#343a30"/><circle cx="27" cy="22" r="2" fill="#343a30"/><circle cx="18" cy="30" r="1.3" fill="#966f65"/><circle cx="26" cy="30" r="1.3" fill="#966f65"/></svg>; }

function playChime(action: CareAction, context: AudioContext) {
  if (context.state === 'suspended') void context.resume();
  const notes = action === 'sleep' ? [392, 330, 262] : action === 'play' ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((freq, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.09;
    oscillator.type = 'sine'; oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(start); oscillator.stop(start + 0.42);
  });
}

export default function App() {
  const [pet, setPet] = useState(loadPet);
  const [tab, setTab] = useState<Tab>('feed');
  const [food, setFood] = useState<Food>('apple');
  const [action, setAction] = useState<{ type: CareAction; id: number; food: Food } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('A little snack would be moo-velous!');
  const [page, setPage] = useState<'meadow' | 'memories'>('meadow');
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(null);
  const [draftName, setDraftName] = useState(pet.name);
  const [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saved, setSaved] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const busyRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const level = Math.floor(pet.xp / 80) + 1;
  const progress = pet.xp % 80;
  const age = Math.floor((Date.now() - pet.birthday) / 86400000) + 1;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pet)); setSaved(true); } catch { setSaved(false); }
  }, [pet]);
  useEffect(() => {
    const interval = setInterval(() => setPet(p => advanceNeeds(p)), 30000);
    return () => { clearInterval(interval); if (timeoutRef.current) clearTimeout(timeoutRef.current); if (toastRef.current) clearTimeout(toastRef.current); if (audioRef.current) void audioRef.current.close(); };
  }, []);
  useEffect(() => {
    const modal = dialogRef.current;
    if (dialog && modal && !modal.open) modal.showModal();
    if (!dialog && modal?.open) modal.close();
  }, [dialog]);

  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 4000);
  }, []);

  const care = useCallback((type: CareAction) => {
    if (busyRef.current) return;
    if (pet.asleep && type !== 'wake') { notify(`${pet.name} is dreaming. Wake her gently first.`); return; }
    if (type === 'feed' && pet.needs.fullness >= 98) { setMessage('My tummy is full. A cuddle instead?'); notify('A happy, full tummy! Try a little play or affection.'); return; }
    if (type === 'play' && pet.needs.energy < 18) { notify(`${pet.name} needs a nap before more adventures.`); setTab('sleep'); return; }
    busyRef.current = true; setBusy(true);
    setAction({ type, id: Date.now(), food });
    const messages: Record<CareAction, string> = {
      feed: food === 'berry' ? 'Berry, berry delicious. Thank you!' : food === 'carrot' ? 'Crunch, crunch… garden goodness!' : 'Nom nom nom. You know me so well!',
      pet: 'Oh, that’s the spot. I love you too ♡', play: 'Catch me if you can! Wheee!', clean: 'A little splash. A lot of sparkle!',
      sleep: 'Just five more minutes… zzz', wake: 'Good moo-rning, my favorite human!',
    };
    setMessage(messages[type]);
    if (pet.sound) {
      try { audioRef.current ??= new AudioContext(); playChime(type, audioRef.current); } catch { /* Audio is optional. */ }
    }
    timeoutRef.current = setTimeout(() => {
      setPet(p => careForPet(p, type, food));
      busyRef.current = false; setBusy(false);
      if (type === 'feed') notify(`Happy tummy! +${foodInfo[food].benefit} fullness · +12 bond`);
      if (type === 'play') notify('What a good game! +18 happiness · +12 bond');
      if (type === 'clean') notify('Fresh as a daisy! +30 cleanliness · +12 bond');
      if (type === 'pet') notify('A little love! +8 happiness · +5 bond');
    }, type === 'play' ? 4200 : type === 'feed' ? 2800 : 2200);
  }, [pet, food, notify]);

  function saveName(event: FormEvent) {
    event.preventDefault();
    const name = draftName.trim().slice(0, 20);
    if (!name) return;
    setPet(p => ({ ...p, name })); setDialog(null); notify(`Say hello to ${name}!`);
  }
  const openSettings = () => { setDraftName(pet.name); setDialog('settings'); };
  const completeCount = ['feed', 'play', 'pet'].filter(item => pet.careToday.includes(item)).length;

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('meadow'); }}><span className="brand-mark"><CowMark /></span><h1>GPT-6</h1></a>
      <nav className="main-nav" aria-label="Main navigation">
        <button className={page === 'meadow' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('meadow')}><Sprout size={17} />My meadow</button>
        <button className={page === 'memories' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('memories')}><BookHeart size={17} />Memory book{pet.memories.length > 0 && <span className="nav-dot" />}</button>
      </nav>
      <div className="header-tools"><button className="sound-button" onClick={() => setPet(p => ({ ...p, sound: !p.sound }))} aria-label={pet.sound ? 'Turn sound off' : 'Turn sound on'}>{pet.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>Sound {pet.sound ? 'on' : 'off'}</span></button><span className="tool-divider" /><button className="icon-button" aria-label="Settings" onClick={openSettings}><Settings2 size={19}/></button><button className="human-avatar" onClick={() => setDialog('help')} aria-label="How to care for your pet"><Flower2 size={21}/></button></div>
    </header>

    <main>
      <div className="page-heading"><div><div className="eyebrow"><span className="tiny-star">✳</span> YOUR LITTLE HAPPY PLACE</div><h2>{page === 'meadow' ? 'A little care. A lot of love.' : 'Little moments, forever kept.'}</h2><p>{page === 'meadow' ? 'Slow down, stay a while. Someone’s happy to see you.' : 'Every snack, every cuddle, every happy little hop.'}</p></div><div className="day-pill"><Sun size={18}/><span>A lovely day to be together</span></div></div>

      {page === 'meadow' ? <div className="meadow-layout"><section className="meadow-main" aria-label="Your pet's meadow">
        <div className={`world-card ${pet.asleep ? 'night' : ''}`}>
          <div className="world-top"><span className="world-label"><span className="status-dot"/>{pet.name.toUpperCase()}’S MEADOW</span><span className="weather">{pet.asleep ? <Moon size={15}/> : <Sun size={15}/>} {pet.asleep ? 'A starry night' : '24° · Sunny'}</span></div>
          <PetScene action={action} asleep={pet.asleep} reducedMotion={reducedMotion} onPet={() => care(pet.asleep ? 'wake' : 'pet')} food={food} />
          <div className="speech-bubble" key={message}>{pet.asleep && !busy ? 'Dreaming of you… and strawberries.' : message}<span className="speech-heart">♡</span></div>
          <div className="world-bottom"><span className="scene-hint"><span className="small-hand">☞</span> {pet.asleep ? 'Tap your little friend to wake her' : 'Tap your little friend for a little love'}</span><button className="view-button" onClick={() => care(pet.asleep ? 'wake' : 'pet')} disabled={busy} aria-label={pet.asleep ? `Wake ${pet.name}` : `Give ${pet.name} a cuddle`}><Heart size={17}/></button></div>
          {busy && <div className="reaction-tag"><Sparkles size={14}/>{action?.type === 'feed' ? 'A delicious little moment' : action?.type === 'play' ? 'Happy little hops' : action?.type === 'clean' ? 'Getting all sparkly' : action?.type === 'sleep' ? 'Getting cozy' : 'Feeling the love'}</div>}
        </div>

        <div className="care-card"><div className="care-tabs" role="tablist" aria-label="Care activities">{careTabs.map(({ id, label, Icon }) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="care-panel" className={tab === id ? 'care-tab selected' : 'care-tab'} onClick={() => setTab(id)}><Icon size={18}/>{label}</button>)}</div>
          <div className="care-content" id="care-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'feed' ? <><div className="care-copy"><span className="section-eyebrow">THE SNACK BAR</span><h3>A little something yummy?</h3><p>Fresh picks for a happy tummy.</p></div><div className="food-options">{(Object.keys(foodInfo) as Food[]).map(f => <button key={f} aria-label={`Select ${foodInfo[f].name}`} aria-pressed={food === f} title={foodInfo[f].description} className={`food-item ${food === f ? 'chosen' : ''}`} onClick={() => setFood(f)}><FoodIcon food={f} size={42}/><span>{foodInfo[f].name}</span>{food === f && <span className="food-check"><Check size={10}/></span>}</button>)}</div><button className="primary-button feed-button" disabled={busy || pet.asleep} onClick={() => care('feed')}><Utensils size={16}/>{busy && action?.type === 'feed' ? 'Nom nom…' : `Feed ${pet.name}`}<span className="button-benefit">+{foodInfo[food].benefit}</span></button></>
            : tab === 'play' ? <><div className="care-copy"><span className="section-eyebrow">A LITTLE ADVENTURE</span><h3>Let’s bounce around.</h3><p>A little movement makes a happy moo.</p></div><div className="activity-illustration play-illustration"><span className="ball-stripe"/><Sparkles size={18}/></div><button className="primary-button" disabled={busy || pet.asleep} onClick={() => care('play')}><Gamepad2 size={17}/>{busy && action?.type === 'play' ? 'Wheee!' : 'Play together'}<ArrowRight size={16}/></button></>
            : tab === 'clean' ? <><div className="care-copy"><span className="section-eyebrow">FRESH AS A DAISY</span><h3>Time for a little splash.</h3><p>Soft bubbles. A squeaky-clean friend.</p></div><div className="activity-illustration clean-illustration"><Droplets size={38}/><span/><span/></div><button className="primary-button" disabled={busy || pet.asleep} onClick={() => care('clean')}><Droplets size={17}/>{busy && action?.type === 'clean' ? 'Splish splash…' : 'Bubble bath'}<ArrowRight size={16}/></button></>
            : <><div className="care-copy"><span className="section-eyebrow">COZY LITTLE MOMENTS</span><h3>{pet.asleep ? 'Sweet dreams, little one.' : 'Even adventures need a nap.'}</h3><p>{pet.asleep ? 'Energy restores while your friend rests.' : 'A soft meadow, a slow breath, a little rest.'}</p></div><div className="activity-illustration sleep-illustration"><Moon size={37}/><span>z z</span></div><button className="primary-button" disabled={busy} onClick={() => care(pet.asleep ? 'wake' : 'sleep')}>{pet.asleep ? <Sun size={17}/> : <Moon size={17}/>}{pet.asleep ? 'Wake gently' : 'Tuck in'}<ArrowRight size={16}/></button></>}
          </div>
        </div>
      </section>

      <aside className="pet-sidebar"><section className="pet-card"><div className="pet-profile"><div className="pet-avatar"><CowMark/><span className="online-dot"/></div><div><div className="pet-name"><h2>{pet.name}</h2><button className="rename-button" onClick={openSettings} aria-label="Rename your pet"><Pencil size={13}/></button></div><span className="pet-mood">{pet.asleep ? 'A sleepy little dreamer' : pet.needs.fullness < 30 ? 'A hungry little moo' : 'A happy little moo'} <span>✿</span></span></div></div><div className="pet-tags"><span><Sprout size={12}/>Little calf</span><span>Day {age} together</span></div>
        <div className="bond-area"><div className="bond-top"><span><Heart size={14}/>Our little bond</span><strong>Level {level}</strong></div><div className="bond-track"><span style={{ width: `${progress / 80 * 100}%` }}/></div><div className="bond-caption"><span>{progress} / 80 love points</span><Sparkles size={11}/></div></div>
        <div className="needs-heading"><h3>A little check-in</h3><span>{Math.min(...Object.values(pet.needs)) < 30 ? 'A LITTLE CARE?' : 'FEELING GOOD'}</span></div><div className="needs-list">{stats.map(({ key, label, Icon, color }) => <div className={`need-row ${color}`} key={key}><span className="need-icon"><Icon size={16}/></span><div className="need-detail"><div><span>{label}</span><strong>{Math.round(pet.needs[key as keyof Needs])}<span>%</span></strong></div><div className="need-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pet.needs[key])}><span style={{ width: `${pet.needs[key]}%` }}/></div></div></div>)}</div>
        <div className="pet-tip"><Leaf size={15}/><p>{pet.asleep ? 'Little dreams recharge big adventures.' : 'A happy pet is made of little moments.'}</p></div></section>
        <section className="daily-card"><div className="daily-header"><span className="daily-flower"><Flower2 size={19}/></span><div><h3>A little love, every day</h3><span>{completeCount === 3 ? 'A lovely day, well spent.' : 'Tiny things. Big happy feelings.'}</span></div><span className="daily-count">{completeCount}/3</span></div><div className="daily-list">{[{ id: 'feed', text: 'Share a yummy snack', action: () => setTab('feed') }, { id: 'play', text: 'Make a little time for play', action: () => setTab('play') }, { id: 'pet', text: 'Give a whole lot of love', action: () => care('pet') }].map(task => <button key={task.id} onClick={task.action} className={pet.careToday.includes(task.id) ? 'daily-task done' : 'daily-task'}><span className="task-check">{pet.careToday.includes(task.id) && <Check size={10}/>}</span>{task.text}<ChevronRight size={12}/></button>)}</div></section>
      </aside></div>
      : <section className="memories-page"><div className="memory-summary"><span className="memory-summary-icon"><BookHeart size={28}/></span><div><h3>Your story with {pet.name}</h3><p>{pet.memories.length} little moments · {age} {age === 1 ? 'day' : 'days'} together · Level {level} friendship</p></div><button className="back-button" onClick={() => setPage('meadow')}><ArrowLeft size={15}/>Back to the meadow</button></div>{pet.memories.length === 0 ? <div className="empty-memories"><Flower2 size={45}/><h3>A lovely story is just beginning.</h3><p>Share a snack or a cuddle. Your little moments will live here.</p><button className="primary-button" onClick={() => setPage('meadow')}>Make your first memory<ArrowRight size={16}/></button></div> : <div className="memory-grid">{pet.memories.map((memory, index) => <article className={`memory-card memory-${memory.action}`} key={memory.id}><div className="memory-art">{memory.food ? <FoodIcon food={memory.food} size={90}/> : memory.action === 'pet' ? <Heart size={58}/> : memory.action === 'play' ? <Gamepad2 size={58}/> : memory.action === 'clean' ? <Droplets size={58}/> : <Moon size={58}/>}<span>✧</span><span>✧</span></div><span className="memory-label">LITTLE MOMENT #{pet.memories.length - index}</span><h3>{memory.title}</h3><p>{new Date(memory.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<span>·</span>{new Date(memory.time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p></article>)}</div>}</section>}

      <footer className="site-footer"><span><Sprout size={14}/>Good things grow with a little care.</span><span className="save-status"><CheckCheck size={14}/>{saved ? 'Your little world is saved automatically' : 'Your little world stays with this open tab'}</span><button onClick={() => setDialog('help')}><CircleHelp size={14}/>A little help</button></footer>
    </main>

    {toast && <div className="toast" role="status"><span><Check size={15}/></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
    <dialog ref={dialogRef} className="app-dialog" onCancel={() => setDialog(null)} onClick={event => { if (event.target === event.currentTarget) setDialog(null); }}><button className="dialog-close icon-button" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={20}/></button>{dialog === 'settings' ? <><span className="dialog-illustration"><Sprout size={30}/></span><div className="eyebrow">MAKE YOURSELF AT HOME</div><h2>Your little world.</h2><p>A few little touches to make it yours.</p><form onSubmit={saveName}><label htmlFor="pet-name-input">Your friend’s name</label><div className="name-input"><input id="pet-name-input" value={draftName} onChange={e => setDraftName(e.target.value)} maxLength={20} required autoComplete="off"/><Pencil size={16}/></div><div className="setting-row"><div><strong>Happy little sounds</strong><span>Gentle chimes for little moments</span></div><button type="button" role="switch" aria-checked={pet.sound} aria-label="Happy little sounds" className={`toggle ${pet.sound ? 'on' : ''}`} onClick={() => setPet(p => ({ ...p, sound: !p.sound }))}><span/></button></div><div className="setting-row"><div><strong>Calmer motion</strong><span>A quieter, less bouncy meadow</span></div><button type="button" role="switch" aria-checked={reducedMotion} aria-label="Calmer motion" className={`toggle ${reducedMotion ? 'on' : ''}`} onClick={() => setReducedMotion(m => !m)}><span/></button></div><button type="submit" className="primary-button">Save little changes<Check size={16}/></button></form></> : <><span className="dialog-illustration"><CloudSun size={33}/></span><div className="eyebrow">WELCOME TO YOUR MEADOW</div><h2>A friend. A little care.</h2><p>There’s no rush here. Just a little cow who’s happy to know you.</p><div className="help-list"><div><Utensils size={21}/><p><strong>Share a little snack.</strong>Choose a fresh treat and watch {pet.name} munch it up.</p></div><div><Heart size={21}/><p><strong>Make a little time.</strong>Tap your friend for a cuddle, play together, or give her a bubble bath.</p></div><div><Moon size={21}/><p><strong>Rest and come back.</strong>Naps restore energy. Your friendship and memories are saved on this browser.</p></div><div><Plus size={21}/><p><strong>Let your friendship grow.</strong>Each little moment earns love points. Your bond grows with every level.</p></div></div><button className="primary-button" onClick={() => setDialog(null)}>Let’s make a little happy<ArrowRight size={17}/></button></>}</dialog>
    <span className="ambient-flower" aria-hidden="true">✳</span>
  </div>;
}
