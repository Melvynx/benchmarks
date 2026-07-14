import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Moon, Palette, Sun } from "lucide-react";
import { useState } from "react";
import {
  DARK_THEME,
  LIGHT_THEME,
  type CardTheme,
  type VideoData,
} from "./card.types";

type CustomizationPanelProps = {
  videoData: VideoData;
  theme: CardTheme;
  onVideoDataChange: (data: VideoData) => void;
  onThemeChange: (theme: CardTheme) => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-foreground text-xs font-semibold tracking-widest uppercase">
      {children}
    </p>
  );
}

function CollapsibleSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
      >
        <Icon className="size-3.5" />
        <span>{label}</span>
        <ChevronDown
          className={`ml-auto size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-2.5 pl-0.5">{children}</div>
      ) : null}
    </div>
  );
}

function ToggleWithInput({
  label,
  checked,
  onToggle,
  value,
  onValueChange,
  placeholder,
  compact,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Switch checked={checked} onCheckedChange={onToggle} />
      </div>
      {checked && onValueChange ? (
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={compact ? "h-7 text-xs" : "h-8 text-sm"}
        />
      ) : null}
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 200,
  step = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hexValue = value.startsWith("#") ? value : "#000000";

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <Input
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 font-mono text-[11px]"
        />
      </div>
    </div>
  );
}

export function CustomizationPanel({
  videoData,
  theme,
  onVideoDataChange,
  onThemeChange,
}: CustomizationPanelProps) {
  const updateCard = (update: Partial<CardTheme["card"]>) => {
    onThemeChange({ ...theme, card: { ...theme.card, ...update } });
  };

  const updateOptions = (update: Partial<CardTheme["options"]>) => {
    onThemeChange({ ...theme, options: { ...theme.options, ...update } });
  };

  const applyPreset = (preset: "light" | "dark") => {
    const base = preset === "light" ? LIGHT_THEME : DARK_THEME;
    onThemeChange({
      ...base,
      card: {
        ...base.card,
        fontSize: theme.card.fontSize,
        spacing: theme.card.spacing,
        borderRadius: theme.card.borderRadius,
      },
      options: theme.options,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Video Data */}
      <div className="flex flex-col gap-3">
        <SectionTitle>Video Data</SectionTitle>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={videoData.title}
              onChange={(e) =>
                onVideoDataChange({ ...videoData, title: e.target.value })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Channel</Label>
            <Input
              value={videoData.channelTitle}
              onChange={(e) =>
                onVideoDataChange({
                  ...videoData,
                  channelTitle: e.target.value,
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="flex flex-col gap-3">
        <SectionTitle>Display</SectionTitle>
        <div className="flex flex-col gap-3">
          <ToggleWithInput
            label="Duration"
            checked={theme.options.showDuration}
            onToggle={(v) => updateOptions({ showDuration: v })}
            value={videoData.duration}
            onValueChange={(v) =>
              onVideoDataChange({ ...videoData, duration: v })
            }
            placeholder="12:34"
            compact
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Channel avatar</Label>
              <Switch
                checked={theme.options.showChannelThumbnail}
                onCheckedChange={(v) =>
                  updateOptions({ showChannelThumbnail: v })
                }
              />
            </div>
            {theme.options.showChannelThumbnail ? (
              <Input
                value={videoData.channelAvatarUrl}
                onChange={(e) =>
                  onVideoDataChange({
                    ...videoData,
                    channelAvatarUrl: e.target.value,
                  })
                }
                placeholder="https://yt3.ggpht.com/... (auto-filled)"
                className="h-7 text-xs"
              />
            ) : null}
          </div>
          <ToggleWithInput
            label="Channel name"
            checked={theme.options.showChannelTitle}
            onToggle={(v) => updateOptions({ showChannelTitle: v })}
          />
          <ToggleWithInput
            label="Views"
            checked={theme.options.showViews}
            onToggle={(v) => updateOptions({ showViews: v })}
            value={videoData.views}
            onValueChange={(v) => onVideoDataChange({ ...videoData, views: v })}
            placeholder="1.2M views"
            compact
          />
          <ToggleWithInput
            label="Published date"
            checked={theme.options.showPublishedAt}
            onToggle={(v) => updateOptions({ showPublishedAt: v })}
            value={videoData.publishedAt}
            onValueChange={(v) =>
              onVideoDataChange({ ...videoData, publishedAt: v })
            }
            placeholder="2 days ago"
            compact
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Progress bar</Label>
              <Switch
                checked={theme.options.progressBar !== null}
                onCheckedChange={(v) =>
                  updateOptions({ progressBar: v ? 35 : null })
                }
              />
            </div>
            {theme.options.progressBar !== null ? (
              <Slider
                value={[theme.options.progressBar]}
                onValueChange={([v]) => updateOptions({ progressBar: v })}
                min={0}
                max={100}
                step={1}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Style */}
      <div className="flex flex-col gap-3">
        <SectionTitle>Style</SectionTitle>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Theme</Label>
          <div className="flex items-center gap-2">
            <Sun className="text-muted-foreground size-3.5" />
            <Switch
              checked={theme.card.background === DARK_THEME.card.background}
              onCheckedChange={(dark) => applyPreset(dark ? "dark" : "light")}
            />
            <Moon className="text-muted-foreground size-3.5" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SliderField
            label="Font size"
            value={theme.card.fontSize}
            onChange={(v) => updateCard({ fontSize: v })}
          />
          <SliderField
            label="Spacing"
            value={theme.card.spacing}
            onChange={(v) => updateCard({ spacing: v })}
          />
          <SliderField
            label="Border radius"
            value={theme.card.borderRadius}
            onChange={(v) => updateCard({ borderRadius: v })}
          />
        </div>

        {/* All colors — single collapsible */}
        <CollapsibleSection label="Colors" icon={Palette}>
          <ColorField
            label="Text"
            value={theme.card.foreground}
            onChange={(v) => updateCard({ foreground: v })}
          />
          <ColorField
            label="Background"
            value={theme.card.background}
            onChange={(v) => updateCard({ background: v })}
          />
          <ColorField
            label="Duration text"
            value={
              theme.duration.foreground.startsWith("#")
                ? theme.duration.foreground
                : "#ffffff"
            }
            onChange={(v) =>
              onThemeChange({
                ...theme,
                duration: { ...theme.duration, foreground: v },
              })
            }
          />
          <ColorField
            label="Duration bg"
            value={
              theme.duration.background.startsWith("#")
                ? theme.duration.background
                : "#000000"
            }
            onChange={(v) =>
              onThemeChange({
                ...theme,
                duration: { ...theme.duration, background: v },
              })
            }
          />
          {theme.options.progressBar !== null ? (
            <>
              <ColorField
                label="Progress fill"
                value={
                  theme.progressBar.foreground.startsWith("#")
                    ? theme.progressBar.foreground
                    : "#ff0000"
                }
                onChange={(v) =>
                  onThemeChange({
                    ...theme,
                    progressBar: { ...theme.progressBar, foreground: v },
                  })
                }
              />
              <ColorField
                label="Progress track"
                value={
                  theme.progressBar.background.startsWith("#")
                    ? theme.progressBar.background
                    : "#c8c8c8"
                }
                onChange={(v) =>
                  onThemeChange({
                    ...theme,
                    progressBar: { ...theme.progressBar, background: v },
                  })
                }
              />
            </>
          ) : null}
        </CollapsibleSection>
      </div>
    </div>
  );
}
