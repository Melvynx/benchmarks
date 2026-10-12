import { LogoMark } from '../ui/LogoMark';

export function Header() {
  return (
    <header className="flex items-center gap-3.5">
      <LogoMark className="size-11 shrink-0 drop-shadow-sm" />
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[1.75rem]">Claude Opus 5.5</h1>
        <p className="text-sm text-ink-3">Find the hours when everyone is awake, wherever they are.</p>
      </div>
    </header>
  );
}
