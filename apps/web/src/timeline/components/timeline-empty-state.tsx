import { ArrowDown01Icon, DragDropIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Centered prompt shown over the tracks area when the timeline has no
 * elements yet. Pure presentational layer — `pointer-events: none` so it
 * never interferes with drag/drop, box-select, or the playhead.
 *
 * The drop machinery (`useTimelineDragDrop`, `useFileUpload` on the assets
 * panel) is unchanged; this overlay just tells the user what those flows
 * are for.
 */
export function TimelineEmptyState() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center"
		>
			<div className="border-border bg-background/70 text-muted-foreground flex items-center gap-2.5 rounded-md border border-dashed px-4 py-3 shadow-sm backdrop-blur">
				<HugeiconsIcon
					icon={DragDropIcon}
					className="size-5 shrink-0"
					strokeWidth={1.5}
				/>
				<div className="text-left">
					<div className="text-foreground text-sm font-medium leading-tight">
						Drag a clip here to start
					</div>
					<div className="text-muted-foreground mt-0.5 text-xs leading-tight">
						Or import from the panel on the left, then drag onto a track.
					</div>
				</div>
			</div>
			<HugeiconsIcon
				icon={ArrowDown01Icon}
				className="text-muted-foreground/70 size-5"
				aria-hidden="true"
			/>
		</div>
	);
}
