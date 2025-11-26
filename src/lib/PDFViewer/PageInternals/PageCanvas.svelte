<script lang="ts" module>
	import { RenderingCancelledException } from 'pdfjs-dist';
	import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
	import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
	import { untrack } from 'svelte';
	import TextLayer from './TextLayer.svelte';
	import AnnotLayer from './AnnotLayer.svelte';
</script>

<script lang="ts">
	interface Props {
		page: PDFPageProxy | undefined;
		viewport: PageViewport | undefined;
		render_text_layer: boolean;
		render_annotation_layer?: boolean;
		imageResourcePath?: string;
		canvasStyles?: string;
		onpagerendersuccess?: (page: PDFPageProxy) => void;
		onpagerendererror?: (err: unknown) => void;
	}

	let {
		page,
		viewport,
		render_text_layer,
		render_annotation_layer = true,
		imageResourcePath = "",
		canvasStyles = '',
		onpagerendersuccess,
		onpagerendererror
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	let render_task: RenderTask | undefined;
	let render_version = 0;

	async function render_page(_page: PDFPageProxy, _viewport: PageViewport, _canvas: HTMLCanvasElement) {
		// Increment version to invalidate any in-progress renders
		const my_version = ++render_version;
		
		// Cancel any existing render task
		if (render_task) {
			render_task.cancel();
			try {
				await render_task.promise;
			} catch {
				// Ignore cancellation error
			}
		}
		
		// Check if we're still the latest render request
		if (my_version !== render_version) return;
		
		render_task = _page.render({
			canvas: _canvas,
			canvasContext: _canvas.getContext('2d')!,
			viewport: _viewport,
		});

		try {
			await render_task.promise;
			if (my_version === render_version) {
				onpagerendersuccess?.(_page);
			}
		} catch (err) {
			if (!(err instanceof RenderingCancelledException)) {
				onpagerendererror?.(err);
				throw err;
			}
		}
	}

	$effect(() => {
		const _page = page;
		const _viewport = viewport;
		const _canvas = canvas;
		if (_page && _viewport && _canvas) {
			untrack(() => render_page(_page, _viewport, _canvas));
		}
	});
</script>

<div style:--scale-factor={viewport?.scale ?? null}>
	<canvas
		bind:this={canvas}
		width={viewport?.width}
		height={viewport?.height}
		style={canvasStyles}
	></canvas>
	{#if render_text_layer && page && viewport}
		<TextLayer {page} {viewport} />
	{/if}
	{#if render_annotation_layer && page && viewport}
		<AnnotLayer {page} {viewport} {imageResourcePath} />
	{/if}
</div>

<style>
	div {
		position: relative;
		padding: 0;
	}

	canvas {
		display: block;
		margin: 0;
	}
</style>
