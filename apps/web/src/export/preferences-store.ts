import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	EXPORT_FORMAT_VALUES,
	EXPORT_QUALITY_VALUES,
	type ExportFormat,
	type ExportQuality,
} from "./index";
import { DEFAULT_EXPORT_OPTIONS } from "./defaults";

/**
 * Last-used export options.
 *
 * Phase 2 only — the export pipeline itself is unchanged. We just remember
 * what the user picked last time so they don't have to re-set it on every
 * export. Persisted to `localStorage` under the key `export-preferences`.
 *
 * `format` and `quality` are validated on load: if a future version drops a
 * value (or the user has stale data from another machine), we fall back to
 * the defaults rather than crash.
 */

interface ExportPreferencesState {
	format: ExportFormat;
	quality: ExportQuality;
	includeAudio: boolean;
	setFormat: ({ format }: { format: ExportFormat }) => void;
	setQuality: ({ quality }: { quality: ExportQuality }) => void;
	setIncludeAudio: ({ includeAudio }: { includeAudio: boolean }) => void;
}

function isExportFormat(value: unknown): value is ExportFormat {
	return (
		typeof value === "string" &&
		EXPORT_FORMAT_VALUES.some((formatValue) => formatValue === value)
	);
}

function isExportQuality(value: unknown): value is ExportQuality {
	return (
		typeof value === "string" &&
		EXPORT_QUALITY_VALUES.some((qualityValue) => qualityValue === value)
	);
}

export const useExportPreferencesStore = create<ExportPreferencesState>()(
	persist(
		(set) => ({
			format: DEFAULT_EXPORT_OPTIONS.format,
			quality: DEFAULT_EXPORT_OPTIONS.quality,
			includeAudio: DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
			setFormat: ({ format }) => set({ format }),
			setQuality: ({ quality }) => set({ quality }),
			setIncludeAudio: ({ includeAudio }) => set({ includeAudio }),
		}),
		{
			name: "export-preferences",
			version: 1,
			partialize: (state) => ({
				format: state.format,
				quality: state.quality,
				includeAudio: state.includeAudio,
			}),
			merge: (persistedState, currentState) => {
				if (typeof persistedState !== "object" || persistedState === null) {
					return currentState;
				}
				const formatRaw =
					"format" in persistedState ? persistedState.format : undefined;
				const qualityRaw =
					"quality" in persistedState ? persistedState.quality : undefined;
				const includeAudioRaw =
					"includeAudio" in persistedState
						? persistedState.includeAudio
						: undefined;

				return {
					...currentState,
					format: isExportFormat(formatRaw)
						? formatRaw
						: currentState.format,
					quality: isExportQuality(qualityRaw)
						? qualityRaw
						: currentState.quality,
					includeAudio:
						typeof includeAudioRaw === "boolean"
							? includeAudioRaw
							: currentState.includeAudio,
				};
			},
		},
	),
);
