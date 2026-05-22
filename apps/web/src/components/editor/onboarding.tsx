"use client";

import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { SOCIAL_LINKS } from "@/site/social";
import { useLocalStorage } from "@/services/storage/use-local-storage";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";

export function Onboarding() {
	const [step, setStep] = useState(0);
	const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage({
		key: "hasSeenOnboarding",
		defaultValue: false,
	});

	const isOpen = !hasSeenOnboarding;

	const handleNext = () => {
		setStep(step + 1);
	};

	const handleClose = () => {
		setHasSeenOnboarding({ value: true });
	};

	const stepConfig = [
		{
			title: "Welcome to OpenCut",
			body: (
				<>
					<Description description="OpenCut is a free, open-source video editor that runs entirely in your browser. Your media never leaves your device." />
					<Description description="Three things to know before you start:" />
				</>
			),
			cta: "Show me",
		},
		{
			title: "Bring your media in",
			body: (
				<>
					<Description description="Add a clip in any of these ways:" />
					<ul className="text-muted-foreground list-disc pl-5 space-y-1 text-sm">
						<li>Click the blue Import button in the Media panel.</li>
						<li>Drag files from your desktop onto the editor.</li>
						<li>Paste media (Cmd/Ctrl+V) anywhere in the editor.</li>
					</ul>
				</>
			),
			cta: "Next",
		},
		{
			title: "Edit, then export",
			body: (
				<>
					<Description description="Drag clips onto the timeline at the bottom. Use Space to play, S to split, Delete to remove." />
					<Description description="When you're ready, click the Export button in the top right." />
					<Description
						description={`This is a beta — found a bug? Tell us on [Discord](${SOCIAL_LINKS.discord}).`}
					/>
				</>
			),
			cta: "Get started",
		},
	] as const;

	const current = stepConfig[step] ?? stepConfig[0];
	const isLast = step >= stepConfig.length - 1;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogBody>
					<div className="space-y-5">
						<div className="space-y-3">
							<DialogTitle className="text-lg font-bold md:text-xl">
								{current.title}
							</DialogTitle>
							<DialogDescription asChild>
								<div className="text-muted-foreground space-y-2">
									{current.body}
								</div>
							</DialogDescription>
						</div>
						<div className="flex flex-col gap-2">
							<Button
								onClick={isLast ? handleClose : handleNext}
								variant="default"
								className="w-full"
							>
								{current.cta}
								<ArrowRightIcon className="size-4" />
							</Button>
							{!isLast ? (
								<button
									type="button"
									onClick={handleClose}
									className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
								>
									Skip tour
								</button>
							) : null}
						</div>
					</div>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
}

function Description({ description }: { description: string }) {
	return (
		<div className="text-muted-foreground text-sm leading-relaxed">
			<ReactMarkdown
				components={{
					p: ({ children }) => <p className="mb-0">{children}</p>,
					a: ({ href, children }) => (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground hover:text-foreground/80 underline"
						>
							{children}
						</a>
					),
				}}
			>
				{description}
			</ReactMarkdown>
		</div>
	);
}
