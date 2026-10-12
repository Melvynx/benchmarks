export type City = { id: string; name: string; country: string; zone: string; flag: string };
export const cities: City[] = [
 ['san-francisco','San Francisco','United States','America/Los_Angeles','🇺🇸'],
 ['los-angeles','Los Angeles','United States','America/Los_Angeles','🇺🇸'],
 ['new-york','New York','United States','America/New_York','🇺🇸'],
 ['chicago','Chicago','United States','America/Chicago','🇺🇸'],
 ['vancouver','Vancouver','Canada','America/Vancouver','🇨🇦'],
 ['toronto','Toronto','Canada','America/Toronto','🇨🇦'],
 ['mexico-city','Mexico City','Mexico','America/Mexico_City','🇲🇽'],
 ['bogota','Bogotá','Colombia','America/Bogota','🇨🇴'],
 ['sao-paulo','São Paulo','Brazil','America/Sao_Paulo','🇧🇷'],
 ['buenos-aires','Buenos Aires','Argentina','America/Argentina/Buenos_Aires','🇦🇷'],
 ['london','London','United Kingdom','Europe/London','🇬🇧'],
 ['paris','Paris','France','Europe/Paris','🇫🇷'],
 ['geneva','Geneva','Switzerland','Europe/Zurich','🇨🇭'],
 ['berlin','Berlin','Germany','Europe/Berlin','🇩🇪'],
 ['lisbon','Lisbon','Portugal','Europe/Lisbon','🇵🇹'],
 ['istanbul','Istanbul','Türkiye','Europe/Istanbul','🇹🇷'],
 ['cairo','Cairo','Egypt','Africa/Cairo','🇪🇬'],
 ['lagos','Lagos','Nigeria','Africa/Lagos','🇳🇬'],
 ['cape-town','Cape Town','South Africa','Africa/Johannesburg','🇿🇦'],
 ['nairobi','Nairobi','Kenya','Africa/Nairobi','🇰🇪'],
 ['dubai','Dubai','United Arab Emirates','Asia/Dubai','🇦🇪'],
 ['riyadh','Riyadh','Saudi Arabia','Asia/Riyadh','🇸🇦'],
 ['mumbai','Mumbai','India','Asia/Kolkata','🇮🇳'],
 ['kathmandu','Kathmandu','Nepal','Asia/Kathmandu','🇳🇵'],
 ['bangkok','Bangkok','Thailand','Asia/Bangkok','🇹🇭'],
 ['singapore','Singapore','Singapore','Asia/Singapore','🇸🇬'],
 ['denpasar','Denpasar','Indonesia','Asia/Makassar','🇮🇩'],
 ['hong-kong','Hong Kong','China','Asia/Hong_Kong','🇭🇰'],
 ['shanghai','Shanghai','China','Asia/Shanghai','🇨🇳'],
 ['seoul','Seoul','South Korea','Asia/Seoul','🇰🇷'],
 ['tokyo','Tokyo','Japan','Asia/Tokyo','🇯🇵'],
 ['sydney','Sydney','Australia','Australia/Sydney','🇦🇺'],
 ['perth','Perth','Australia','Australia/Perth','🇦🇺'],
 ['auckland','Auckland','New Zealand','Pacific/Auckland','🇳🇿'],
].map(([id,name,country,zone,flag])=>({id,name,country,zone,flag}));
export type Settings = { ids: string[]; wake: number; sleep: number; format: '12h' | '24h'; mode: 'meeting' | 'base' };
export const defaults: Settings = { ids: ['san-francisco','denpasar','geneva'], wake: 7, sleep: 23, format: '12h', mode: 'meeting' };
export function offsetMinutes(zone: string, date: Date): number {
 const value = new Intl.DateTimeFormat('en-US',{timeZone: zone,timeZoneName:'longOffset'}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value || 'GMT';
 const match = value.match(/GMT([+-])(\d{2}):(\d{2})/);
 return match ? (match[1] === '+' ? 1 : -1) * (Number(match[2])*60+Number(match[3])) : 0;
}
export function offsetLabel(offset: number): string {
 return `UTC${offset >= 0 ? '+' : '−'}${Math.floor(Math.abs(offset)/60)}${Math.abs(offset)%60 ? ':'+String(Math.abs(offset)%60).padStart(2,'0') : ''}`;
}
export function localMinutes(hour: number, cityOffset: number, referenceOffset: number) { return ((hour*60+cityOffset-referenceOffset)%1440+1440)%1440; }
export function isAwake(minutes: number, wake: number, sleep: number) {
 if(wake === sleep) return true;
 return wake < sleep ? minutes >= wake*60 && minutes < sleep*60 : minutes >= wake*60 || minutes < sleep*60;
}
export function formatTime(minutes: number, format: Settings['format'], compact = false): string {
 const hour = Math.floor(((minutes%1440)+1440)%1440/60), minute = ((minutes%60)+60)%60;
 if (format==='24h') return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 return `${hour%12 || 12}${minute ? ':'+String(minute).padStart(2,'0') : ''}${compact ? '' : hour<12 ? 'am' : 'pm'}`;
}
export function overlapMasks(offsets: number[], settings: Settings): boolean[][] {
 const awake = offsets.map(offset=>Array.from({length:24},(_,hour)=>isAwake(localMinutes(hour,offset,offsets[0]),settings.wake,settings.sleep)));
 if(settings.mode==='meeting') return awake.map(()=>Array.from({length:24},(_,hour)=>awake.every(row=>row[hour])));
 const pairs = awake.map(row=>row.map((value,hour)=>value && awake[0][hour]));
 if (pairs.length > 1) pairs[0] = pairs[0].map((_,hour)=>pairs.slice(1).some(row=>row[hour]));
 return pairs;
}
export function ranges(mask: boolean[]): [number,number][] {
 const result: [number,number][] = [];
 for(let hour=0;hour<24;hour++) if(mask[hour]) { const start=hour; while(hour<24 && mask[hour]) hour++; result.push([start,hour]); }
 return result;
}
export function restoreSettings(): Settings {
 try {
  const saved = JSON.parse(localStorage.getItem('gpt6-timezones') || 'null');
  if(!saved) return defaults;
  const ids: string[] = Array.isArray(saved.ids) ? [...new Set<string>(saved.ids.filter((id: unknown)=>cities.some(city=>city.id===id)))] : defaults.ids;
  return {ids: Array.isArray(saved.ids) && (saved.ids.length === 0 || ids.length > 0) ? ids : defaults.ids, wake: Number.isInteger(saved.wake)&&saved.wake>=0&&saved.wake<24?saved.wake:7, sleep:Number.isInteger(saved.sleep)&&saved.sleep>=0&&saved.sleep<24?saved.sleep:23, format:saved.format==='24h'?'24h':'12h',mode:saved.mode==='base'?'base':'meeting'};
 } catch {return defaults;}
}
