const paths = {
  Sprout:'<path d="M12 21v-9M12 14C4 14 3 8 3 3c6 0 9 3 9 9M12 17c0-7 4-11 9-11 0 7-3 11-9 11"/>',
  Leaf:'<path d="M20 3c-9-1-17 2-17 10a7 7 0 0 0 7 7c8 0 11-8 10-17ZM3 21 15 9"/>',
  Heart:'<path d="m20.8 4.6 0 0a5.6 5.6 0 0 0-8 0l-.8.8-.8-.8a5.6 5.6 0 0 0-8 8L12 22l8.8-9.4a5.6 5.6 0 0 0 0-8Z"/>',
  Sparkles:'<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z M20 2v4m-2-2h4"/>',
  Sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  Moon:'<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z"/>',
  Volume2:'<path d="m11 4-5 4H2v8h4l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  VolumeX:'<path d="m11 4-5 4H2v8h4l5 4ZM16 9l5 6m0-6-5 6"/>',
  Settings2:'<path d="M3 6h5m4 0h9M3 18h9m4 0h5"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="18" r="2"/>',
  House:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  BookOpen:'<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z"/>',
  Gift:'<path d="M3 8h18v4H3ZM5 12v9h14v-9M12 8v13"/><path d="M12 8c-8 0-8-7-4-6 3 0 4 6 4 6Zm0 0c8 0 8-7 4-6-3 0-4 6-4 6Z"/>',
  ArrowUpRight:'<path d="M7 17 17 7M7 7h10v10"/>',
  Utensils:'<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-5 3-5 10 0 10"/>',
  Gamepad2:'<path d="M7 7h10c4 0 7 12 3 13-3 1-4-4-6-4h-4c-2 0-3 5-6 4C0 19 3 7 7 7Z M6 10v5m-2.5-2.5h5M16 11h.1M19 14h.1"/>',
  Droplets:'<path d="M8 3S2 9 2 13a6 6 0 0 0 12 0C14 9 8 3 8 3ZM18 2s-4 4-4 7a4 4 0 0 0 8 0c0-3-4-7-4-7Z"/>',
  X:'<path d="m6 6 12 12M6 18 18 6"/>',Check:'<path d="m4 12 5 5L20 6"/>',ChevronRight:'<path d="m9 5 7 7-7 7"/>',
  Camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/>',
  Maximize:'<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',RotateCcw:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
  Apple:'<path d="M12 7c-8-4-12 3-8 11 2 5 6 2 8 2s6 3 8-2c4-8 0-15-8-11Zm0 0c0-4 2-6 5-6"/>',
  Star:'<path d="m12 2 3 6.5 7 1-5 5 1 7-6-3.5L6 21l1-6.5-5-5 7-1Z"/>'
};
export const Leaf='Leaf',Heart='Heart',Sparkles='Sparkles',Sun='Sun',Moon='Moon',Volume2='Volume2',VolumeX='VolumeX',Settings2='Settings2',House='House',BookOpen='BookOpen',Gift='Gift',ArrowUpRight='ArrowUpRight',Utensils='Utensils',Gamepad2='Gamepad2',Droplets='Droplets',X='X',Check='Check',ChevronRight='ChevronRight',Camera='Camera',Maximize='Maximize',RotateCcw='RotateCcw',Apple='Apple',Star='Star',Sprout='Sprout';
export function createIcons(){ document.querySelectorAll('i[data-lucide]').forEach(element=>{const name=element.dataset.lucide.replace(/(^|-)([a-z])/g,(_,dash,letter)=>letter.toUpperCase());const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.innerHTML=paths[name]||paths.Sparkles;element.replaceWith(svg);}); }
