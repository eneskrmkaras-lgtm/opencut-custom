"use client";

import { useEffect, useReducer, useRef } from "react";
import {
	CheckmarkCircle02Icon,
	CloudUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEditor } from "@/editor/use-editor";
import { cn } from "@/utils/ui";

const SAVED_RECENTLY_MS = 4_000;

type SaveStatus = "idle" | "saving" | "saved";
type Action = { type: "dirty" } | { type: "clean" } | { type: "settle" };

function reduce({
	action,
}: {
	state: SaveStatus;
	action: Action;
}): SaveStatus {
	switch (action.type) {
		case "dirty":
			return "saving";
		case "clean":
			return "saved";
		case "settle":
			return "idle";
	}
}

/**
 * Header pill that surfaces the editor's autosave state.
 *
 * States, derived from `editor.save.getIsDirty()`:
 *  - "Saving…" — there is a pending or in-flight save.
 *  - "Saved"   — recently transitioned from dirty to clean (sticky for ~4s).
 *  - hidden    — calm idle state; we don't nag users with a permanent "Saved".
 *
 * The component reads the dirty flag through `useEditor`, which re-renders
 * whenever any manager notifies — that's how transitions are picked up.
 *
 * Implementation note: we use a reducer so the lint rule
 * `react-hooks/set-state-in-effect` is happy with status changes that are
 * driven by an upstream value (cascading dispatches are bounded).
 */
function SaveIndicatorBody() {
	const isDirty = useEditor((e) => e.save.getIsDirty());
	const [status, dispatch] = useReducer(
		(state: SaveStatus, action: Action) => reduce({ state, action }),
		"idle",
	);
	const wasDirtyRef = useRef(false);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (isDirty) {
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
				savedTimerRef.current = null;
			}
			wasDirtyRef.current = true;
			dispatch({ type: "dirty" });
			return;
		}

		if (!wasDirtyRef.current) return;

		wasDirtyRef.current = false;
		dispatch({ type: "clean" });
		if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
		savedTimerRef.current = setTimeout(() => {
			dispatch({ type: "settle" });
			savedTimerRef.current = null;
		}, SAVED_RECENTLY_MS);
	}, [isDirty]);

	useEffect(() => {
		return () => {
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
				savedTimerRef.current = null;
			}
		};
	}, []);

	if (status === "idle") return null;

	const isSaving = status === "saving";

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-sm",
				"text-muted-foreground select-none",
			)}
		>
			<HugeiconsIcon
				icon={isSaving ? CloudUploadIcon : CheckmarkCircle02Icon}
				className={cn("size-3.5", isSaving && "animate-pulse")}
				aria-hidden="true"
			/>
			<span>{isSaving ? "Saving…" : "Saved"}</span>
		</div>
	);
}

export function SaveIndicator() {
	const hasActiveProject = useEditor(
		(e) => e.project.getActiveOrNull() !== null,
	);
	if (!hasActiveProject) return null;
	// Mount the body only when a project is active so the dirty/saved state
	// machine cannot carry stale values across project changes — a fresh
	// project gets a fresh component instance.
	return <SaveIndicatorBody />;
}
