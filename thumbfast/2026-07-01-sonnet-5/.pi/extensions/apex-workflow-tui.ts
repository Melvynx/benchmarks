import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

type ApexFlag =
	| "auto"
	| "examine"
	| "save"
	| "test"
	| "verify"
	| "economy"
	| "branch"
	| "pullRequest"
	| "interactive"
	| "tasks"
	| "teams";

interface ApexStep {
	id: string;
	name: string;
	file: string;
	when: string;
	objective: string;
	decisions: string[];
	outputs: string[];
}

interface ApexState {
	task: string;
	flags: Record<ApexFlag, boolean>;
	selectedStep: number;
	panel: "steps" | "decisions" | "flags";
	message?: string;
}

interface LiveStepState {
	startedAt?: number;
	endedAt?: number;
	toolCount: number;
	logs: string[];
}

interface LiveApexState {
	command: string;
	status: "configuring" | "running" | "done" | "error";
	startedAt: number;
	endedAt?: number;
	currentStep: number;
	selectedStep: number;
	activeStepIndexes: number[];
	steps: LiveStepState[];
	tools: Record<string, number>;
	activeTools: Record<string, { name: string; startedAt: number; summary: string }>;
	logs: string[];
	message?: string;
}

const APEX_STEPS: ApexStep[] = [
	{
		id: "00",
		name: "Init",
		file: "steps/step-00-init.md",
		when: "Always first",
		objective: "Parse flags, derive task id + feature name, initialize APEX state.",
		decisions: ["Which flags are active?", "Is this a fresh run or resume?", "What is the task boundary?"],
		outputs: ["{task_description}", "{feature_name}", "{task_id}", "mode booleans"],
	},
	{
		id: "00b",
		name: "Save setup",
		file: "steps/step-00b-save.md",
		when: "If -s/--save",
		objective: "Create durable output structure under .claude/output/apex/.",
		decisions: ["Where should artifacts live?", "What needs to be append-only for recovery?"],
		outputs: ["{output_dir}", "per-step output files"],
	},
	{
		id: "00b",
		name: "Branch setup",
		file: "steps/step-00b-branch.md",
		when: "If -b/--branch or -pr/--pull-request",
		objective: "Ensure work happens off main and name a safe branch.",
		decisions: ["Are we currently on main?", "Should an existing branch be reused?", "What branch name matches the task?"],
		outputs: ["{branch_name}", "clean git worktree expectation"],
	},
	{
		id: "00b",
		name: "Economy override",
		file: "steps/step-00b-economy.md",
		when: "If -e/--economy",
		objective: "Disable token-expensive subagent behavior and prefer direct exploration.",
		decisions: ["Can context be gathered without agents?", "Which analysis is essential only?"],
		outputs: ["economy constraints", "reduced parallelism"],
	},
	{
		id: "00b",
		name: "Interactive config",
		file: "steps/step-00b-interactive.md",
		when: "If -i/--interactive",
		objective: "Let the user choose flags before the workflow proceeds.",
		decisions: ["Which optional checks are worth the time?", "Should confirmations be skipped?"],
		outputs: ["final flag set"],
	},
	{
		id: "01",
		name: "Analyze",
		file: "steps/step-01-analyze.md",
		when: "Always",
		objective: "Gather codebase context and acceptance criteria before planning.",
		decisions: ["Which similar files establish the pattern?", "What hidden constraints exist?", "What acceptance criteria prove done?"],
		outputs: ["{acceptance_criteria}", "context map", "risk notes"],
	},
	{
		id: "02",
		name: "Plan",
		file: "steps/step-02-plan.md",
		when: "Always",
		objective: "Produce a file-by-file implementation strategy and TaskList.",
		decisions: ["What changes belong in scope?", "What order minimizes risk?", "Where are validation points?"],
		outputs: ["implementation plan", "TaskList", "files to edit"],
	},
	{
		id: "02b",
		name: "Tasks",
		file: "steps/step-02b-tasks.md",
		when: "If -k/--tasks or -m/--teams",
		objective: "Break work into dependency-aware slices.",
		decisions: ["Which tasks can run independently?", "Which tasks unblock others?", "What is each slice's done condition?"],
		outputs: ["task dependency graph", "parallelizable slices"],
	},
	{
		id: "03",
		name: "Execute",
		file: "steps/step-03-execute.md",
		when: "Default implementation path",
		objective: "Implement the TaskList in order with focused edits.",
		decisions: ["Which todo is next?", "Does a discovered issue require replanning?", "Is each edit minimal and reversible?"],
		outputs: ["code changes", "updated todo state"],
	},
	{
		id: "03t",
		name: "Agent Teams execute",
		file: "steps/step-03-execute-teams.md",
		when: "If -m/--teams",
		objective: "Coordinate parallel agents for independent implementation slices.",
		decisions: ["Which agent owns which slice?", "How are conflicts merged?", "What integration pass is required?"],
		outputs: ["parallel implementation results", "integration notes"],
	},
	{
		id: "04",
		name: "Validate",
		file: "steps/step-04-validate.md",
		when: "Always after execution",
		objective: "Run self-checks, typecheck, lint, and targeted validation.",
		decisions: ["Which commands are authoritative?", "Are failures from our changes?", "Can issues be fixed now?"],
		outputs: ["validation command results", "fix list"],
	},
	{
		id: "07/08",
		name: "Tests",
		file: "steps/step-07-tests.md + step-08-run-tests.md",
		when: "If -t/--test",
		objective: "Create meaningful tests and run them through a fix loop.",
		decisions: ["Unit, integration, or e2e?", "What regression should fail before fix?", "When is test evidence sufficient?"],
		outputs: ["test files", "test run results"],
	},
	{
		id: "05",
		name: "Examine",
		file: "steps/step-05-examine.md",
		when: "If -x/--examine",
		objective: "Run adversarial review against the implementation.",
		decisions: ["What would break in production?", "What was overfit?", "Which findings are real blockers?"],
		outputs: ["review findings", "severity list"],
	},
	{
		id: "06",
		name: "Resolve",
		file: "steps/step-06-resolve.md",
		when: "If examine finds issues",
		objective: "Fix accepted review findings without widening scope.",
		decisions: ["Which findings to accept?", "Which fixes are smallest?", "Does resolution require re-validation?"],
		outputs: ["finding resolutions", "post-fix validation"],
	},
	{
		id: "10",
		name: "Verify",
		file: "steps/step-10-verify.md",
		when: "If -v/--verify",
		objective: "Launch the app and verify the feature behaves for a user.",
		decisions: ["What is the user path?", "What evidence proves it works?", "What logs/screenshots are needed?"],
		outputs: ["runtime verification evidence"],
	},
	{
		id: "09",
		name: "Finish",
		file: "steps/step-09-finish.md",
		when: "Always final; PR only if -pr",
		objective: "Summarize, save final outputs, and optionally create a PR.",
		decisions: ["Is the branch ready?", "What should reviewers know?", "Which validations were run?"],
		outputs: ["final summary", "PR URL if enabled"],
	},
];

const FLAG_META: Array<{ key: ApexFlag; on: string; off: string; long: string; label: string; help: string }> = [
	{ key: "auto", on: "-a", off: "-A", long: "--auto", label: "auto", help: "Skip confirmations / auto approve" },
	{ key: "examine", on: "-x", off: "-X", long: "--examine", label: "examine", help: "Adversarial review" },
	{ key: "save", on: "-s", off: "-S", long: "--save", label: "save", help: "Save artifacts" },
	{ key: "test", on: "-t", off: "-T", long: "--test", label: "test", help: "Create and run tests" },
	{ key: "verify", on: "-v", off: "-V", long: "--verify", label: "verify", help: "Launch and verify feature" },
	{ key: "economy", on: "-e", off: "-E", long: "--economy", label: "economy", help: "No subagents / fewer tokens" },
	{ key: "branch", on: "-b", off: "-B", long: "--branch", label: "branch", help: "Create/use feature branch" },
	{ key: "pullRequest", on: "-pr", off: "-PR", long: "--pull-request", label: "pull request", help: "Create PR, enables branch" },
	{ key: "interactive", on: "-i", off: "", long: "--interactive", label: "interactive", help: "APEX internal flag menu" },
	{ key: "tasks", on: "-k", off: "-K", long: "--tasks", label: "tasks", help: "Task breakdown" },
	{ key: "teams", on: "-m", off: "-M", long: "--teams", label: "teams", help: "Parallel agent teams, enables tasks" },
];

const DEFAULT_FLAGS: Record<ApexFlag, boolean> = {
	auto: false,
	examine: false,
	save: false,
	test: false,
	verify: false,
	economy: false,
	branch: false,
	pullRequest: false,
	interactive: false,
	tasks: false,
	teams: false,
};

function parseInitialFlags(raw: string): { flags: Record<ApexFlag, boolean>; task: string } {
	const flags = { ...DEFAULT_FLAGS };
	const parts = raw.trim().split(/\s+/).filter(Boolean);
	const taskParts: string[] = [];
	for (const part of parts) {
		const meta = FLAG_META.find((item) => item.on === part || item.off === part || item.long === part);
		if (!meta) {
			taskParts.push(part);
			continue;
		}
		flags[meta.key] = meta.on === part || meta.long === part;
	}
	return { flags, task: taskParts.join(" ") };
}

function buildFlags(flags: Record<ApexFlag, boolean>): string[] {
	const normalized = { ...flags };
	if (normalized.pullRequest) normalized.branch = true;
	if (normalized.teams) normalized.tasks = true;
	return FLAG_META.filter((meta) => normalized[meta.key]).map((meta) => meta.on);
}

function buildApexPrompt(state: ApexState): string {
	const flags = buildFlags(state.flags);
	return ["/apex", ...flags, state.task.trim()].filter(Boolean).join(" ");
}

function padAnsi(line: string, width: number): string {
	const padding = Math.max(0, width - visibleWidth(line));
	return `${line}${" ".repeat(padding)}`;
}

function center(text: string, width: number): string {
	const len = visibleWidth(text);
	const left = Math.max(0, Math.floor((width - len) / 2));
	return padAnsi(`${" ".repeat(left)}${text}`, width);
}

function formatDuration(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function createLiveState(command: string): LiveApexState {
	const startedAt = Date.now();
	const steps: LiveStepState[] = APEX_STEPS.map(() => ({ toolCount: 0, logs: [] }));
	steps[0].startedAt = startedAt;
	const parsed = parseInitialFlags(command.replace(/^\/apex\s*/, ""));
	const activeStepIndexes = getActiveStepIndexes(parsed.flags);
	return {
		command,
		status: "running",
		startedAt,
		currentStep: activeStepIndexes[0] ?? 0,
		selectedStep: activeStepIndexes[0] ?? 0,
		activeStepIndexes,
		steps,
		tools: {},
		activeTools: {},
		logs: [`Launching ${command}`],
		message: "Starting APEX",
	};
}

function summarizeToolInput(input: unknown): string {
	if (!input || typeof input !== "object") return "";
	const record = input as Record<string, unknown>;
	const path = typeof record.path === "string" ? record.path : undefined;
	const command = typeof record.command === "string" ? record.command : undefined;
	const query = typeof record.query === "string" ? record.query : undefined;
	const task = typeof record.task === "string" ? record.task : undefined;
	const summary = path ?? command ?? query ?? task ?? JSON.stringify(record).slice(0, 120);
	return summary.replace(/\s+/g, " ").slice(0, 160);
}

function findStepIndexFromText(text: string): number | undefined {
	const normalized = text.replace(/\\/g, "/");
	for (let i = 0; i < APEX_STEPS.length; i++) {
		const files = APEX_STEPS[i].file.split(" + ");
		if (files.some((file) => normalized.includes(file) || normalized.includes(file.split("/").pop() ?? file))) {
			return i;
		}
	}
	return undefined;
}

function pushLiveLog(state: LiveApexState, text: string): void {
	const stamp = formatDuration(Date.now() - state.startedAt).padStart(6, " ");
	const line = `${stamp}  ${text}`;
	state.logs.push(line);
	state.logs = state.logs.slice(-200);
	const step = state.steps[state.currentStep];
	step.logs.push(line);
	step.logs = step.logs.slice(-60);
}

function switchLiveStep(state: LiveApexState, stepIndex: number): void {
	if (stepIndex < 0 || stepIndex >= APEX_STEPS.length || !state.activeStepIndexes.includes(stepIndex) || state.currentStep === stepIndex) return;
	const now = Date.now();
	const previous = state.steps[state.currentStep];
	if (previous.startedAt && !previous.endedAt) previous.endedAt = now;
	const next = state.steps[stepIndex];
	if (!next.startedAt) next.startedAt = now;
	state.currentStep = stepIndex;
	state.selectedStep = stepIndex;
	pushLiveLog(state, `Step changed → ${APEX_STEPS[stepIndex].id} ${APEX_STEPS[stepIndex].name}`);
}

function getActiveStepIndexes(flags: Record<ApexFlag, boolean>): number[] {
	return APEX_STEPS.map((step, index) => ({ step, index }))
		.filter(({ step }) => {
			if (step.name === "Save setup") return flags.save;
			if (step.name === "Branch setup") return flags.branch || flags.pullRequest;
			if (step.name === "Economy override") return flags.economy;
			if (step.name === "Interactive config") return flags.interactive;
			if (step.name === "Tasks") return flags.tasks || flags.teams;
			if (step.name === "Execute") return !flags.teams;
			if (step.name === "Agent Teams execute") return flags.teams;
			if (step.name === "Tests") return flags.test;
			if (step.name === "Examine") return flags.examine;
			if (step.name === "Resolve") return flags.examine;
			if (step.name === "Verify") return flags.verify;
			return true;
		})
		.map(({ index }) => index);
}

function getPrimaryAction(step: ApexStep): string {
	return step.decisions[0] ?? step.objective;
}

class ApexWorkflowComponent {
	private cachedWidth = 0;
	private cachedLines: string[] = [];
	private version = 0;
	private cachedVersion = -1;

	constructor(
		private state: ApexState,
		private tui: { requestRender: () => void },
		private theme: {
			fg: (color: string, text: string) => string;
			bg: (color: string, text: string) => string;
			bold: (text: string) => string;
		},
		private done: (result: string | null) => void,
	) {}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "q" || data === "Q") {
			this.done(null);
			return;
		}
		if (matchesKey(data, Key.enter)) {
			if (!this.state.task.trim()) {
				this.state.message = "Add a task after /apex first, or run /apex-ui <task>.";
				this.bump();
				return;
			}
			this.done(buildApexPrompt(this.state));
			return;
		}
		if (matchesKey(data, Key.up)) {
			this.state.selectedStep = Math.max(0, this.state.selectedStep - 1);
			this.bump();
			return;
		}
		if (matchesKey(data, Key.down)) {
			this.state.selectedStep = Math.min(APEX_STEPS.length - 1, this.state.selectedStep + 1);
			this.bump();
			return;
		}
		if (matchesKey(data, Key.left) || matchesKey(data, Key.right) || matchesKey(data, Key.tab)) {
			this.cyclePanel(matchesKey(data, Key.left) ? -1 : 1);
			return;
		}

		const key = data.toLowerCase();
		const keyMap: Record<string, ApexFlag> = {
			a: "auto",
			x: "examine",
			s: "save",
			t: "test",
			v: "verify",
			e: "economy",
			b: "branch",
			p: "pullRequest",
			i: "interactive",
			k: "tasks",
			m: "teams",
		};
		const flag = keyMap[key];
		if (flag) {
			this.state.flags[flag] = !this.state.flags[flag];
			if (flag === "pullRequest" && this.state.flags.pullRequest) this.state.flags.branch = true;
			if (flag === "teams" && this.state.flags.teams) this.state.flags.tasks = true;
			this.state.message = `${flag} ${this.state.flags[flag] ? "enabled" : "disabled"}`;
			this.bump();
		}
	}

	invalidate(): void {
		this.cachedWidth = 0;
	}

	render(width: number): string[] {
		if (this.cachedWidth === width && this.cachedVersion === this.version) return this.cachedLines;

		const w = Math.max(50, width);
		const accent = (s: string) => this.theme.fg("accent", s);
		const muted = (s: string) => this.theme.fg("muted", s);
		const dim = (s: string) => this.theme.fg("dim", s);
		const success = (s: string) => this.theme.fg("success", s);
		const warning = (s: string) => this.theme.fg("warning", s);
		const border = (s: string) => this.theme.fg("border", s);
		const selected = (s: string) => this.theme.bg("selectedBg", this.theme.fg("accent", s));

		const stepWidth = Math.max(30, Math.floor(w * 0.38));
		const detailWidth = Math.max(20, w - stepWidth - 3);
		const lines: string[] = [];

		lines.push(border("╭" + "─".repeat(w - 2) + "╮"));
		lines.push(border("│") + center(accent(this.theme.bold("APEX Workflow Cockpit")), w - 2) + border("│"));
		lines.push(border("├" + "─".repeat(w - 2) + "┤"));
		lines.push(border("│") + padAnsi(` Task: ${this.state.task ? success(this.state.task) : warning("<missing>")}`, w - 2) + border("│"));
		lines.push(border("│") + padAnsi(` Command: ${muted(buildApexPrompt(this.state) || "/apex")}`, w - 2) + border("│"));
		lines.push(border("├" + "─".repeat(stepWidth) + "┬" + "─".repeat(detailWidth) + "┤"));

		const left = this.renderStepList(stepWidth, selected, accent, muted, dim);
		const right = this.renderDetail(detailWidth, accent, muted, dim, success, warning);
		const bodyRows = Math.max(left.length, right.length, 18);
		for (let i = 0; i < bodyRows; i++) {
			lines.push(border("│") + padAnsi(left[i] ?? "", stepWidth) + border("│") + padAnsi(right[i] ?? "", detailWidth) + border("│"));
		}

		lines.push(border("├" + "─".repeat(w - 2) + "┤"));
		if (this.state.message) {
			lines.push(border("│") + padAnsi(` ${warning(this.state.message)}`, w - 2) + border("│"));
		}
		lines.push(
			border("│") +
				padAnsi(
					` ${dim("↑↓ step • tab/←→ panel • a x s t v e b p i k m toggle • enter launch • esc cancel")}`,
					w - 2,
				) +
				border("│"),
		);
		lines.push(border("╰" + "─".repeat(w - 2) + "╯"));

		this.cachedLines = lines.map((line) => truncateToWidth(line, width, ""));
		this.cachedWidth = width;
		this.cachedVersion = this.version;
		return this.cachedLines;
	}

	private renderStepList(width: number, selected: (s: string) => string, accent: (s: string) => string, muted: (s: string) => string, dim: (s: string) => string): string[] {
		const lines = [` ${this.state.panel === "steps" ? accent("Steps") : muted("Steps")}`];
		for (let i = 0; i < APEX_STEPS.length; i++) {
			const step = APEX_STEPS[i];
			const prefix = i === this.state.selectedStep ? "▶" : " ";
			const text = `${prefix} ${step.id.padEnd(3)} ${step.name}`;
			lines.push(i === this.state.selectedStep ? selected(` ${text}`) : ` ${dim(text)}`);
		}
		return lines.map((line) => truncateToWidth(line, width, "…"));
	}

	private renderDetail(width: number, accent: (s: string) => string, muted: (s: string) => string, dim: (s: string) => string, success: (s: string) => string, warning: (s: string) => string): string[] {
		const step = APEX_STEPS[this.state.selectedStep];
		const lines: string[] = [];
		lines.push(` ${this.state.panel === "decisions" ? accent("Decision map") : muted("Decision map")}`);
		lines.push(` ${accent(this.theme.bold(`${step.id} ${step.name}`))} ${dim(step.file)}`);
		lines.push(` ${warning("When:")} ${step.when}`);
		lines.push("");
		for (const line of wrapTextWithAnsi(`${success("Objective:")} ${step.objective}`, width - 2)) lines.push(` ${line}`);
		lines.push("");
		lines.push(` ${accent("Decisions")}`);
		for (const decision of step.decisions) {
			for (const line of wrapTextWithAnsi(`- ${decision}`, width - 2)) lines.push(` ${line}`);
		}
		lines.push("");
		lines.push(` ${accent("Outputs")}`);
		for (const output of step.outputs) lines.push(` ${dim("-")} ${output}`);
		lines.push("");
		lines.push(` ${this.state.panel === "flags" ? accent("Flags") : muted("Flags")}`);
		for (const meta of FLAG_META) {
			const active = this.state.flags[meta.key];
			const marker = active ? success("●") : dim("○");
			const hotkey = meta.on.replace("-", "").replace("pr", "p");
			lines.push(` ${marker} ${hotkey.padEnd(2)} ${meta.label.padEnd(12)} ${dim(meta.help)}`);
		}
		return lines.map((line) => truncateToWidth(line, width, "…"));
	}

	private cyclePanel(delta: number): void {
		const panels: ApexState["panel"][] = ["steps", "decisions", "flags"];
		const current = panels.indexOf(this.state.panel);
		this.state.panel = panels[(current + delta + panels.length) % panels.length];
		this.bump();
	}

	private bump(): void {
		this.version++;
		this.tui.requestRender();
	}
}

class LiveApexComponent {
	private cachedWidth = 0;
	private cachedLines: string[] = [];
	private cachedSignature = "";
	private interval: ReturnType<typeof setInterval> | undefined;

	constructor(
		private state: LiveApexState,
		private tui: { requestRender: () => void },
		private theme: {
			fg: (color: string, text: string) => string;
			bg: (color: string, text: string) => string;
			bold: (text: string) => string;
		},
		private done: () => void,
	) {
		this.interval = setInterval(() => this.tui.requestRender(), 1000);
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "q" || data === "Q") {
			this.dispose();
			this.done();
			return;
		}
		if (matchesKey(data, Key.up)) {
			const position = Math.max(0, this.state.activeStepIndexes.indexOf(this.state.selectedStep) - 1);
			this.state.selectedStep = this.state.activeStepIndexes[position] ?? this.state.selectedStep;
			this.tui.requestRender();
			return;
		}
		if (matchesKey(data, Key.down)) {
			const position = Math.min(this.state.activeStepIndexes.length - 1, this.state.activeStepIndexes.indexOf(this.state.selectedStep) + 1);
			this.state.selectedStep = this.state.activeStepIndexes[position] ?? this.state.selectedStep;
			this.tui.requestRender();
			return;
		}
		if (data === "c" || data === "C") {
			this.state.selectedStep = this.state.currentStep;
			this.tui.requestRender();
		}
	}

	invalidate(): void {
		this.cachedWidth = 0;
	}

	render(width: number): string[] {
		const signature = JSON.stringify({
			status: this.state.status,
			currentStep: this.state.currentStep,
			selectedStep: this.state.selectedStep,
			latestLog: this.state.logs.at(-1),
			active: Object.keys(this.state.activeTools),
			tick: Math.floor(Date.now() / 1000),
		});
		if (this.cachedWidth === width && this.cachedSignature === signature) return this.cachedLines;

		const w = Math.max(70, width);
		const accent = (s: string) => this.theme.fg("accent", s);
		const muted = (s: string) => this.theme.fg("muted", s);
		const dim = (s: string) => this.theme.fg("dim", s);
		const success = (s: string) => this.theme.fg("success", s);
		const warning = (s: string) => this.theme.fg("warning", s);
		const error = (s: string) => this.theme.fg("error", s);
		const border = (s: string) => this.theme.fg("border", s);
		const selected = (s: string) => this.theme.bg("selectedBg", this.theme.fg("accent", s));
		const statusColor = this.state.status === "done" ? success : this.state.status === "error" ? error : warning;
		const elapsed = formatDuration((this.state.endedAt ?? Date.now()) - this.state.startedAt);
		const stepWidth = Math.max(34, Math.floor(w * 0.36));
		const detailWidth = Math.max(34, w - stepWidth - 3);
		const lines: string[] = [];

		lines.push(border("╭" + "─".repeat(w - 2) + "╮"));
		lines.push(border("│") + center(accent(this.theme.bold("APEX Live Run")), w - 2) + border("│"));
		lines.push(border("├" + "─".repeat(w - 2) + "┤"));
		lines.push(border("│") + padAnsi(` ${statusColor(this.state.status.toUpperCase())} ${muted(elapsed)}  ${dim(this.state.command)}`, w - 2) + border("│"));
		lines.push(border("├" + "─".repeat(stepWidth) + "┬" + "─".repeat(detailWidth) + "┤"));

		const left = this.renderTimeline(stepWidth, selected, accent, muted, dim, success, warning);
		const right = this.renderStepPanel(detailWidth, accent, muted, dim, success, warning);
		const rows = Math.max(left.length, right.length, 22);
		for (let i = 0; i < rows; i++) {
			lines.push(border("│") + padAnsi(left[i] ?? "", stepWidth) + border("│") + padAnsi(right[i] ?? "", detailWidth) + border("│"));
		}
		lines.push(border("├" + "─".repeat(w - 2) + "┤"));
		lines.push(border("│") + padAnsi(` ${dim("↑↓ inspect step • c current step • q/esc close dashboard (agent continues)")}`, w - 2) + border("│"));
		lines.push(border("╰" + "─".repeat(w - 2) + "╯"));

		this.cachedLines = lines.map((line) => truncateToWidth(line, width, ""));
		this.cachedWidth = width;
		this.cachedSignature = signature;
		return this.cachedLines;
	}

	private renderTimeline(width: number, selected: (s: string) => string, accent: (s: string) => string, muted: (s: string) => string, dim: (s: string) => string, success: (s: string) => string, warning: (s: string) => string): string[] {
		const lines = [` ${accent("Progress")}`];
		for (const i of this.state.activeStepIndexes) {
			const step = APEX_STEPS[i];
			const runtime = this.state.steps[i];
			const isCurrent = i === this.state.currentStep;
			const isSelected = i === this.state.selectedStep;
			const mark = isCurrent ? warning("▶") : runtime.endedAt ? success("✓") : runtime.startedAt ? warning("•") : dim("○");
			const duration = runtime.startedAt ? formatDuration((runtime.endedAt ?? Date.now()) - runtime.startedAt) : "-";
			const text = ` ${mark} ${step.id.padEnd(3)} ${step.name.padEnd(20)} ${duration.padStart(6)}`;
			lines.push(isSelected ? selected(text) : truncateToWidth(text, width, "…"));
		}
		return lines.map((line) => truncateToWidth(line, width, "…"));
	}

	private renderStepPanel(width: number, accent: (s: string) => string, muted: (s: string) => string, dim: (s: string) => string, success: (s: string) => string, warning: (s: string) => string): string[] {
		const step = APEX_STEPS[this.state.selectedStep];
		const runtime = this.state.steps[this.state.selectedStep];
		const lines: string[] = [];
		const active = Object.values(this.state.activeTools).at(-1);
		lines.push(` ${accent(this.theme.bold(`${step.id} ${step.name}`))} ${dim(step.when)}`);
		lines.push(` ${muted(step.file)}`);
		lines.push(` ${success("Time:")} ${runtime.startedAt ? formatDuration((runtime.endedAt ?? Date.now()) - runtime.startedAt) : "not started"}`);
		lines.push("");
		lines.push(` ${accent("Current action")}`);
		for (const line of wrapTextWithAnsi(getPrimaryAction(step), width - 2)) lines.push(` ${line}`);
		lines.push("");
		lines.push(` ${accent("Current tool")}`);
		if (!active) {
			lines.push(` ${dim("waiting")}`);
		} else {
			const age = formatDuration(Date.now() - active.startedAt).padStart(5);
			lines.push(` ${warning("•")} ${active.name} ${dim(age)}`);
			if (active.summary) lines.push(` ${dim(truncateToWidth(active.summary, width - 2, "…"))}`);
		}
		lines.push("");
		lines.push(` ${accent("Latest log")}`);
		const latestLog = runtime.logs.at(-1) ?? this.state.logs.at(-1) ?? "waiting";
		for (const line of wrapTextWithAnsi(dim(latestLog), width - 2)) lines.push(` ${line}`);
		return lines.map((line) => truncateToWidth(line, width, "…"));
	}

	dispose(): void {
		if (this.interval) clearInterval(this.interval);
		this.interval = undefined;
	}
}

async function showApexCockpit(ctx: ExtensionContext, rawArgs: string): Promise<string | null> {
	if (!ctx.hasUI) return null;
	const parsed = parseInitialFlags(rawArgs);
	const state: ApexState = {
		task: parsed.task,
		flags: parsed.flags,
		selectedStep: 0,
		panel: "steps",
	};
	return await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		return new ApexWorkflowComponent(state, tui, theme as never, done);
	});
}

export default function apexWorkflowTui(pi: ExtensionAPI): void {
	let lastApexCommand: string | undefined;
	let liveState: LiveApexState | undefined;
	let liveRender: (() => void) | undefined;

	function requestLiveRender(): void {
		liveRender?.();
	}

	function markLiveDone(status: "done" | "error" = "done"): void {
		if (!liveState) return;
		const now = Date.now();
		liveState.status = status;
		liveState.endedAt = now;
		const current = liveState.steps[liveState.currentStep];
		if (current.startedAt && !current.endedAt) current.endedAt = now;
		pushLiveLog(liveState, status === "done" ? "APEX agent finished" : "APEX agent ended with error");
		requestLiveRender();
	}

	async function showAndRunApex(ctx: ExtensionContext, rawArgs: string): Promise<void> {
		const command = await showApexCockpit(ctx, rawArgs);
		if (!command) return;
		lastApexCommand = command;
		updateStatus(ctx);
		liveState = createLiveState(command);

		await ctx.ui.custom<void>((tui, theme, _keybindings, done) => {
			const component = new LiveApexComponent(liveState!, tui, theme as never, () => {
				liveRender = undefined;
				done(undefined);
			});
			liveRender = () => tui.requestRender();
			setTimeout(() => {
				try {
					pi.sendUserMessage(command);
				} catch (error) {
					if (liveState) {
						liveState.status = "error";
						pushLiveLog(liveState, `Failed to launch agent: ${error instanceof Error ? error.message : String(error)}`);
					}
					tui.requestRender();
				}
			}, 0);
			return component;
		});
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (!lastApexCommand) {
			ctx.ui.setStatus("apex", undefined);
			ctx.ui.setWidget("apex", undefined);
			return;
		}
		ctx.ui.setStatus("apex", ctx.ui.theme.fg("accent", "APEX"));
		ctx.ui.setWidget("apex", [
			ctx.ui.theme.fg("accent", "APEX workflow active"),
			ctx.ui.theme.fg("dim", lastApexCommand),
		], { placement: "belowEditor" });
	}

	pi.registerCommand("apex-ui", {
		description: "Open full-screen APEX workflow cockpit, then run /apex inside a live dashboard",
		handler: async (args, ctx) => {
			await showAndRunApex(ctx, args ?? "");
		},
	});

	pi.registerShortcut(Key.ctrlShift("a"), {
		description: "Open APEX live workflow cockpit",
		handler: async (ctx) => {
			await showAndRunApex(ctx, "");
		},
	});

	pi.on("input", async (event, ctx) => {
		const text = event.text.trim();
		const isApex = text === "$apex" || text.startsWith("$apex ") || text === "/apex" || text.startsWith("/apex ");
		if (!isApex || event.source === "extension") return { action: "continue" as const };
		if (!ctx.hasUI) return { action: "continue" as const };

		const rawArgs = text.startsWith("$apex") ? text.slice("$apex".length) : text.slice("/apex".length);
		void showAndRunApex(ctx, rawArgs).catch((error) => {
			ctx.ui.notify(`APEX live dashboard failed: ${error instanceof Error ? error.message : String(error)}`, "error");
		});
		return { action: "handled" as const };
	});

	pi.on("agent_start", async () => {
		if (!liveState) return;
		liveState.status = "running";
		pushLiveLog(liveState, "Agent started");
		requestLiveRender();
	});

	pi.on("turn_start", async (event) => {
		if (!liveState) return;
		pushLiveLog(liveState, `Turn ${event.turnIndex + 1} started`);
		requestLiveRender();
	});

	pi.on("tool_execution_start", async (event) => {
		if (!liveState) return;
		const inputText = JSON.stringify(event.args ?? {});
		const stepIndex = findStepIndexFromText(inputText);
		if (stepIndex !== undefined) switchLiveStep(liveState, stepIndex);
		const summary = summarizeToolInput(event.args);
		liveState.tools[event.toolName] = (liveState.tools[event.toolName] ?? 0) + 1;
		liveState.activeTools[event.toolCallId] = { name: event.toolName, startedAt: Date.now(), summary };
		liveState.steps[liveState.currentStep].toolCount++;
		pushLiveLog(liveState, `Tool start: ${event.toolName}${summary ? ` — ${summary}` : ""}`);
		requestLiveRender();
	});

	pi.on("tool_execution_end", async (event) => {
		if (!liveState) return;
		const active = liveState.activeTools[event.toolCallId];
		delete liveState.activeTools[event.toolCallId];
		const took = active ? ` (${formatDuration(Date.now() - active.startedAt)})` : "";
		pushLiveLog(liveState, `Tool ${event.isError ? "error" : "done"}: ${event.toolName}${took}`);
		if (event.isError) liveState.message = `${event.toolName} failed; APEX should resolve or report it`;
		requestLiveRender();
	});

	pi.on("message_update", async (event) => {
		if (!liveState || event.message.role !== "assistant") return;
		const text = JSON.stringify(event.message.content ?? "");
		const stepIndex = findStepIndexFromText(text);
		if (stepIndex !== undefined) {
			switchLiveStep(liveState, stepIndex);
			requestLiveRender();
		}
	});

	pi.on("agent_end", async (_event, ctx) => {
		markLiveDone("done");
		updateStatus(ctx);
	});

	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const entry = entries
			.filter((item: { type: string; customType?: string }) => item.type === "custom" && item.customType === "apex-workflow-tui")
			.pop() as { data?: { command?: string } } | undefined;
		lastApexCommand = entry?.data?.command;
		updateStatus(ctx);
	});

	pi.on("turn_start", async () => {
		if (lastApexCommand) pi.appendEntry("apex-workflow-tui", { command: lastApexCommand });
	});

}
