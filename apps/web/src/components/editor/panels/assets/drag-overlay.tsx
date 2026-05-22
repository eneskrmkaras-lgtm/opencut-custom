import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, UploadIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

interface MediaDragOverlayProps {
	isVisible: boolean;
	isProcessing?: boolean;
	progress?: number;
	/**
	 * When true, the overlay is rendered because a drag is in progress over
	 * the panel. We swap the copy to the imperative "Drop here" form and
	 * give it a brighter accent.
	 */
	isDragging?: boolean;
	onClick?: () => void;
}

const ACCEPTED_FILE_TYPES_LABEL = "Videos, photos, and audio";

export function MediaDragOverlay({
	isVisible,
	isProcessing = false,
	progress = 0,
	isDragging = false,
	onClick,
}: MediaDragOverlayProps) {
	if (!isVisible) return null;

	const handleClick = ({
		event,
	}: {
		event: React.MouseEvent<HTMLButtonElement>;
	}) => {
		if (isProcessing || !onClick) return;
		event.preventDefault();
		event.stopPropagation();
		onClick();
	};

	const headline = isProcessing
		? `Importing your files (${Math.round(progress)}%)`
		: isDragging
			? "Drop to import"
			: "Add your first clip";

	const helper = isProcessing
		? "Hang tight — this happens locally, nothing is uploaded."
		: isDragging
			? `${ACCEPTED_FILE_TYPES_LABEL} are accepted.`
			: `Drag a file here, paste with Cmd/Ctrl+V, or click to browse. ${ACCEPTED_FILE_TYPES_LABEL}.`;

	return (
		<button
			className={cn(
				"flex flex-col items-center justify-center gap-4 rounded-lg p-8 text-center transition-colors",
				"bg-foreground/5 hover:bg-foreground/10",
				isDragging &&
					"bg-accent-action/10 hover:bg-accent-action/15 ring-1 ring-accent-action/40 ring-offset-2 ring-offset-background",
				isProcessing && "cursor-default",
			)}
			type="button"
			disabled={isProcessing || !onClick}
			onClick={(event) => handleClick({ event })}
			aria-label={isProcessing ? headline : "Import media"}
		>
			<div className="flex items-center justify-center">
				<HugeiconsIcon
					icon={isDragging ? CloudUploadIcon : UploadIcon}
					className={cn(
						"size-10",
						isDragging ? "text-accent-action" : "text-foreground",
					)}
				/>
			</div>

			<div className="space-y-1.5">
				<p className="text-foreground text-sm font-medium">{headline}</p>
				<p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
					{helper}
				</p>
			</div>

			{isProcessing && (
				<div className="w-full max-w-xs" aria-hidden="true">
					<div className="bg-muted/50 h-1.5 w-full overflow-hidden rounded-full">
						<div
							className="bg-primary h-full rounded-full transition-[width] duration-200"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			)}
		</button>
	);
}
