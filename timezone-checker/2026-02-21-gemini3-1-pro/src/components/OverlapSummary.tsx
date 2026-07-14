import { useStore } from '../store';
import type { City } from '../data/cities';
import { getReferenceDayHours, formatCityHour, getHourInTimezone, isAwake, findOverlapRanges } from '../utils/time';
import { Clock } from 'lucide-react';

export function OverlapSummary({ activeCities }: { activeCities: City[] }) {
  const { mode, wakeHour, sleepHour, timeFormat } = useStore();

  if (activeCities.length < 2) return null;

  const refCity = activeCities[0];
  const referenceHours = getReferenceDayHours(refCity.timezone);
  const is24h = timeFormat === '24h';

  if (mode === 'meeting') {
    const overlapHours = referenceHours.map((hourDate) => {
      // is everyone awake at this hour point?
      return activeCities.every((city) => {
        const localHour = getHourInTimezone(hourDate, city.timezone);
        return isAwake(localHour, wakeHour, sleepHour);
      });
    });

    const ranges = findOverlapRanges(overlapHours);
    const totalHours = overlapHours.filter(Boolean).length;

    return (
      <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900 rounded-xl p-6">
        <h3 className="text-primary-800 dark:text-primary-300 font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          Meeting Mode: {activeCities.length} Locations
        </h3>
        
        {totalHours === 0 ? (
          <p className="mt-2 text-primary-700 dark:text-primary-400 font-medium">
            There is no overlapping time when everyone is awake. Try adjusting your waking hours or removing a city.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-zinc-600 dark:text-zinc-400 text-sm">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalHours} hours</span> overlap in {refCity.name} time:
            </span>
            <div className="flex flex-wrap gap-2">
              {ranges.map((r, i) => (
                <span key={i} className="px-3 py-1 bg-white dark:bg-zinc-900 border border-primary-200 dark:border-primary-800 rounded-full text-sm font-medium text-primary-700 dark:text-primary-400">
                  {formatCityHour(r.start, refCity.timezone, is24h)} — {formatCityHour(r.end, refCity.timezone, is24h)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // base mode
  return (
    <div className="space-y-4">
      <h3 className="text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-2 px-2">
        <Clock className="w-5 h-5 text-zinc-500" />
        Base Mode: vs {refCity.name}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeCities.slice(1).map((city) => {
          const overlapHours = referenceHours.map((hourDate) => {
            const refLocal = getHourInTimezone(hourDate, refCity.timezone);
            const refAwake = isAwake(refLocal, wakeHour, sleepHour);
            const cityLocal = getHourInTimezone(hourDate, city.timezone);
            const cityAwake = isAwake(cityLocal, wakeHour, sleepHour);
            return refAwake && cityAwake;
          });

          const ranges = findOverlapRanges(overlapHours);
          const totalHours = overlapHours.filter(Boolean).length;

          return (
            <div key={city.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{city.name}</span>
              {totalHours === 0 ? (
                <span className="text-red-500 dark:text-red-400 text-sm mt-2">No overlap</span>
              ) : (
                <>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 mb-3">{totalHours} hrs common availability</span>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {ranges.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {formatCityHour(r.start, refCity.timezone, is24h)} - {formatCityHour(r.end, refCity.timezone, is24h)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
