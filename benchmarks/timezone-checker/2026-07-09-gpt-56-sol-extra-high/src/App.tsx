import { Info } from 'lucide-react';

import { AppHeader } from './components/AppHeader';
import { ControlsPanel } from './components/ControlsPanel';
import { OverlapSummary } from './components/OverlapSummary';
import { TimezoneSchedule, type CitySchedule } from './components/TimezoneSchedule';
import { CITY_BY_ID } from './data/cities';
import { usePersistentPlanner } from './hooks/usePersistentPlanner';
import {
  formatDateForReference,
  formatUtcOffset,
  getBaseOverlapMask,
  getCityAwakeMask,
  getLocalTime,
  getMeetingOverlapMask,
  getUtcOffsetMinutes,
} from './lib/timezone';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export default function App() {
  const { state, updateState } = usePersistentPlanner();
  const now = new Date();
  const cities = state.cityIds.flatMap((cityId) => {
    const city = CITY_BY_ID.get(cityId);
    return city ? [city] : [];
  });
  const referenceCity = cities[0];
  const meetingMask = getMeetingOverlapMask(cities, state.wakeHour, state.sleepHour, now);
  const baseMasks = new Map(
    referenceCity
      ? cities.slice(1).map((city) => [
          city.id,
          getBaseOverlapMask(referenceCity, city, state.wakeHour, state.sleepHour, now),
        ])
      : [],
  );
  const schedules = referenceCity
    ? buildSchedules(cities, state, meetingMask, baseMasks, now)
    : [];

  function addCity(cityId: string) {
    if (state.cityIds.includes(cityId)) return;
    updateState({ cityIds: [...state.cityIds, cityId] });
  }

  function removeCity(cityId: string) {
    updateState({ cityIds: state.cityIds.filter((selectedId) => selectedId !== cityId) });
  }

  function promoteCity(cityId: string) {
    if (state.cityIds[0] === cityId) return;
    updateState({ cityIds: [cityId, ...state.cityIds.filter((selectedId) => selectedId !== cityId)] });
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <main>
        <section className="intro-row">
          <div className="intro-copy">
            <span className="eyebrow">Timezone overlap checker</span>
            <h2>See the shared day<br />before you send the invite.</h2>
          </div>
          <p>
            Every column is one hour in your reference city. Tap any city name to move it to the front.
          </p>
        </section>

        <div className="planner-layout">
          <ControlsPanel state={state} onChange={updateState} onAddCity={addCity} />

          <div className="planner-main">
            <OverlapSummary
              cities={cities}
              mode={state.mode}
              timeFormat={state.timeFormat}
              meetingMask={meetingMask}
              baseMasks={baseMasks}
            />

            <TimezoneSchedule
              schedules={schedules}
              timeFormat={state.timeFormat}
              referenceDateLabel={referenceCity ? formatDateForReference(now, referenceCity.timeZone) : ''}
              onPromoteCity={promoteCity}
              onRemoveCity={removeCity}
            />

            <div className="schedule-footer">
              <div className="legend" aria-label="Grid legend">
                <span><i className="legend-swatch is-overlap" />Overlap</span>
                <span><i className="legend-swatch is-awake" />Awake</span>
                <span><i className="legend-swatch is-sleeping" />Sleeping</span>
              </div>
              <p><Info size={14} />{state.mode === 'meeting' ? 'Green cells = everyone awake' : 'Green cells = awake with your reference city'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function buildSchedules(
  cities: NonNullable<ReturnType<typeof CITY_BY_ID.get>>[],
  state: ReturnType<typeof usePersistentPlanner>['state'],
  meetingMask: boolean[],
  baseMasks: Map<string, boolean[]>,
  now: Date,
): CitySchedule[] {
  const referenceCity = cities[0];
  if (!referenceCity) return [];

  const referenceOffset = getUtcOffsetMinutes(now, referenceCity.timeZone);
  return cities.map((city, cityIndex) => {
    const cityOffset = getUtcOffsetMinutes(now, city.timeZone);
    const overlapMask = state.mode === 'meeting'
      ? meetingMask
      : cityIndex === 0
        ? HOURS.map(() => false)
        : baseMasks.get(city.id) ?? HOURS.map(() => false);

    return {
      city,
      offsetLabel: formatUtcOffset(cityOffset),
      localTimes: HOURS.map((hour) => getLocalTime(hour, referenceOffset, cityOffset)),
      awakeMask: getCityAwakeMask(city, referenceCity, state.wakeHour, state.sleepHour, now),
      overlapMask,
    };
  });
}
