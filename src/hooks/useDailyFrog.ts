import { useQuery } from '@tanstack/react-query';
import { fetchDailyFrog } from '../api/teable';

// The day the Frog of the Day follows. 'utc' gives every visitor the same frog
// at the same moment, changing at midnight UTC; 'local' would follow each
// visitor's own calendar day instead (the worker serves yesterday–tomorrow).
const DAY_MODE: 'utc' | 'local' = 'utc';

function currentDate(): string {
  const d = new Date();
  if (DAY_MODE === 'utc') return d.toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// PFDB Frog of the Day — picked and cached by the worker, so this is one small
// request (and the same answer for everyone on that date).
export function useDailyFrog() {
  const date = currentDate();
  const { data, isLoading } = useQuery({
    queryKey:  ['daily-frog', date],
    queryFn:   () => fetchDailyFrog(date),
    staleTime: 1000 * 60 * 60,
  });

  return {
    name:      data?.name ?? null,
    level:     data?.level ?? null,
    value:     data?.frog?.value ?? null,
    speed:     data?.frog?.speed ?? null,
    stamina:   data?.frog?.stamina ?? null,
    baseId:    data?.baseId ?? null,
    secId:     data?.secId ?? null,
    breedId:   data?.breedId ?? null,
    isLoading,
  };
}
