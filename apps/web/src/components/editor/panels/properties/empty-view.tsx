import { Settings05Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Properties panel empty state.
 *
 * Re-implemented in Phase 1 on top of the shared `<EmptyState>` so every
 * empty surface in the app shares one visual language.
 */
export function EmptyView() {
	return (
		<EmptyState
			icon={Settings05Icon}
			title="Nothing selected"
			description="Click an element on the timeline to edit its properties."
		/>
	);
}
