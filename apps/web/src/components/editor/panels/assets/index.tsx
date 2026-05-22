"use client";

import { Separator } from "@/components/ui/separator";
import { type Tab, useAssetsPanelStore } from "@/components/editor/panels/assets/assets-panel-store";
import { TabBar } from "./tabbar";
import { Captions } from "@/subtitles/components/assets-view";
import { MediaView } from "./views/assets";
import { SettingsView } from "./views/settings";
import { SoundsView } from "@/sounds/components/assets-view";
import { StickersView } from "@/stickers/components/assets-view";
import { TextView } from "@/text/components/assets-view";
import { EffectsView } from "@/effects/components/assets-view";
import { EmptyState } from "@/components/ui/empty-state";
import {
	ArrowRightDoubleIcon,
	SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";

export function AssetsPanel() {
	const { activeTab } = useAssetsPanelStore();

	const viewMap: Record<Tab, React.ReactNode> = {
		media: <MediaView />,
		sounds: <SoundsView />,
		text: <TextView />,
		stickers: <StickersView />,
		effects: <EffectsView />,
		transitions: (
			<EmptyState
				icon={ArrowRightDoubleIcon}
				title="Transitions are coming soon"
				description="We're building scene-to-scene transitions. In the meantime, you can fade clips with keyframes on the Blending tab."
			/>
		),
		captions: <Captions />,
		adjustment: (
			<EmptyState
				icon={SlidersHorizontalIcon}
				title="Adjustment layers are coming soon"
				description="Per-clip color and lighting tweaks are on the roadmap. Use the Effects tab for what's available today."
			/>
		),
		settings: <SettingsView />,
	};

	return (
		<div className="panel bg-background flex h-full rounded-sm border overflow-hidden">
			<TabBar />
			<Separator orientation="vertical" />
			<div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
		</div>
	);
}
