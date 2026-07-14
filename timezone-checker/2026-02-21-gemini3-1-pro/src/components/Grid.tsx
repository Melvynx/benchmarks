import { useStore } from '../store';
import type { City } from '../data/cities';
import { getReferenceDayHours, formatHour, formatCityHour, getHourInTimezone, isAwake, formatOffsetString } from '../utils/time';
import { cn } from '../utils/classnames';
import { Trash2, Crown } from 'lucide-react';

export function Grid({ activeCities }: { activeCities: City[] }) {
  if (activeCities.length === 0) return null;

  return (
    <div className="space-y-8 w-full">
      {/* Desktop Layout -> hidden on mobile */}
      <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <HorizontalGrid activeCities={activeCities} />
      </div>

      {/* Mobile Layout -> hidden on desktop */}
      <div className="block md:hidden border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <VerticalGrid activeCities={activeCities} />
      </div>
    </div>
  );
}

function HorizontalGrid({ activeCities }: { activeCities: City[] }) {
  const { mode, wakeHour, sleepHour, removeCity, timeFormat, makeReference } = useStore();
  const refCity = activeCities[0];
  const refHours = getReferenceDayHours(refCity.timezone);
  const is24h = timeFormat === '24h';

  return (
    <div className="w-full relative">
      <table className="w-full text-left border-collapse">
        <thead className="bg-zinc-50 dark:bg-zinc-950/50 hidden sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="w-48 xl:w-64 px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-20 border-r border-zinc-200 dark:border-zinc-800">
              City
            </th>
            {refHours.map((_, i) => (
              <th key={i} className="px-1 text-center font-medium text-xs text-zinc-400 py-3 w-10">
                {formatCityHour(i, refCity.timezone, is24h)}
              </th>
            ))}
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {activeCities.map((city, cIndex) => {
            const isRef = cIndex === 0;

            return (
              <tr key={city.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                <td className="w-48 xl:w-64 px-4 py-3 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-zinc-200 dark:border-zinc-800 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/80 transition-colors">
                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => makeReference(city.id)}>
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        {city.name}
                        {isRef && <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-primary-200 dark:ring-primary-800">REF</span>}
                        {!isRef && <Crown className="w-3 h-3 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-primary-400 transition-all hover:text-primary-500!" />}
                      </div>
                      <div className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-2">
                        {formatOffsetString(city.timezone)}
                      </div>
                    </div>
                  </div>
                </td>
                
                {refHours.map((hourDate, i) => {
                  const localHour = getHourInTimezone(hourDate, city.timezone);
                  const isAwakeLocal = isAwake(localHour, wakeHour, sleepHour);

                  let isOverlap = false;
                  if (mode === 'meeting') {
                    // Everyone must be awake
                    isOverlap = activeCities.every((c) => {
                      const cLocalHour = getHourInTimezone(hourDate, c.timezone);
                      return isAwake(cLocalHour, wakeHour, sleepHour);
                    });
                  } else {
                    // Base mode: Only refCity and this city must be awake
                    if (isRef) {
                      isOverlap = false; // Reference city doesn't have an overlap of its own in base mode
                    } else {
                      const refLocal = getHourInTimezone(hourDate, refCity.timezone);
                      const refAwake = isAwake(refLocal, wakeHour, sleepHour);
                      isOverlap = refAwake && isAwakeLocal;
                    }
                  }

                  return (
                    <td key={i} className="p-0 text-center w-8">
                      <div className={cn(
                        "mx-0.5 my-1.5 flex items-center justify-center text-xs py-1.5 rounded-md border text-center transition-colors font-medium cursor-default tabular-nums",
                        !isAwakeLocal && "bg-zinc-50 dark:bg-zinc-950/50 border-transparent text-zinc-400/50 dark:text-zinc-600/50",
                        isAwakeLocal && !isOverlap && "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
                        isOverlap && "bg-primary-100 dark:bg-primary-900/40 border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-50 font-bold scale-[1.02] shadow-sm z-10 relative"
                      )}>
                        {formatHour(localHour, is24h)}
                      </div>
                    </td>
                  );
                })}

                <td className="w-12 px-2 py-0 text-center">
                  {!isRef && (
                    <button
                      onClick={() => removeCity(city.id)}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VerticalGrid({ activeCities }: { activeCities: City[] }) {
  const { mode, wakeHour, sleepHour, makeReference, timeFormat, removeCity } = useStore();
  const refCity = activeCities[0];
  const refHours = getReferenceDayHours(refCity.timezone);
  const is24h = timeFormat === '24h';

  return (
    <div className="w-full relative overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-max">
        <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20">
          <tr>
            <th className="px-3 py-3 w-16 sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-30 border-r border-zinc-200 dark:border-zinc-800"></th>
            {activeCities.map((city, cIndex) => {
              const isRef = cIndex === 0;
              return (
                <th key={city.id} className={cn("px-4 py-3 bg-zinc-50 dark:bg-zinc-950 font-semibold text-zinc-900 dark:text-zinc-50 sticky top-0 z-20 border-r border-zinc-200 dark:border-zinc-800 min-w-32", isRef ? "bg-primary-50/50 dark:bg-primary-950/20" : "")}>
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 cursor-pointer w-full group" onClick={() => makeReference(city.id)}>
                      <span className="truncate flex-1 max-w-[100px]">{city.name}</span>
                      {isRef && <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap">REF</span>}
                      {!isRef && <Crown className="w-3 h-3 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 shrink-0 hover:text-primary-500!" />}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-medium text-zinc-500">{formatOffsetString(city.timezone)}</span>
                      {!isRef && (
                        <button onClick={() => removeCity(city.id)} className="text-zinc-400 hover:text-red-500 rounded p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {refHours.map((hourDate, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
              <td className="px-3 py-2 text-xs font-medium text-zinc-500 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-zinc-200 dark:border-zinc-800 tabular-nums">
                {formatCityHour(rowIdx, refCity.timezone, is24h)}
              </td>
              
              {activeCities.map((city, cIndex) => {
                const isRef = cIndex === 0;
                const localHour = getHourInTimezone(hourDate, city.timezone);
                const isAwakeLocal = isAwake(localHour, wakeHour, sleepHour);

                let isOverlap = false;
                if (mode === 'meeting') {
                  // Everyone must be awake
                  isOverlap = activeCities.every((c) => {
                    const cLocalHour = getHourInTimezone(hourDate, c.timezone);
                    return isAwake(cLocalHour, wakeHour, sleepHour);
                  });
                } else {
                  // Base mode: Only refCity and this city must be awake
                  if (isRef) {
                    isOverlap = false; // Reference city doesn't have an overlap of its own in base mode
                  } else {
                    const refLocal = getHourInTimezone(hourDate, refCity.timezone);
                    const refAwake = isAwake(refLocal, wakeHour, sleepHour);
                    isOverlap = refAwake && isAwakeLocal;
                  }
                }

                return (
                  <td key={city.id} className={cn("p-2 text-center border-r border-zinc-100 dark:border-zinc-800/50", isRef && "bg-zinc-50/30 dark:bg-zinc-950/20")}>
                    <div className={cn(
                        "mx-auto w-12 flex items-center justify-center text-xs py-1.5 rounded-md border text-center transition-colors font-medium tabular-nums cursor-default",
                        !isAwakeLocal && "bg-zinc-50 dark:bg-zinc-950/50 border-transparent text-zinc-400/50 dark:text-zinc-600/50",
                        isAwakeLocal && !isOverlap && "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
                        isOverlap && "bg-primary-100 dark:bg-primary-900/40 border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-50 font-bold scale-105 shadow-sm"
                      )}>
                        {formatHour(localHour, is24h)}
                      </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
