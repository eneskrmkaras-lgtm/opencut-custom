import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/utils/ui";

type EmptyStateVariant = "default" | "error";

interface EmptyStateProps {
	icon?: IconSvgElement;
	title: string;
	description?: React.ReactNode;
	action?: React.ReactNode;
	variant?: EmptyStateVariant;
	className?: string;
}

/**
 * Shared empty / error / "coming soon" state.
 *
 * Use this anywhere a panel, page, or container has nothing to show. Keeps
 * visual language consistent across the app (icon in a soft rounded square,
 * title, description, optional CTA below).
 */
export function EmptyState({
	icon,
	title,
	description,
	action,
	variant = "default",
	className,
}: EmptyStateProps) {
	const isError = variant === "error";

	return (
		<div
			className={cn(
				"flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center",
				className,
			)}
			role={isError ? "alert" : undefined}
		>
			{icon ? (
				<div
					className={cn(
						"flex size-14 items-center justify-center rounded-md border",
						isError
							? "bg-destructive/10 border-destructive/20 text-destructive"
							: "bg-accent/35 text-muted-foreground",
					)}
				>
					<HugeiconsIcon icon={icon} className="size-7" strokeWidth={1.5} />
				</div>
			) : null}
			<div className="flex flex-col items-center gap-2">
				<h3
					className={cn(
						"text-base font-medium",
						isError && "text-destructive",
					)}
				>
					{title}
				</h3>
				{description ? (
					<p className="text-muted-foreground max-w-md text-sm text-balance">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="flex items-center gap-2">{action}</div> : null}
		</div>
	);
}
