<script lang="ts" module>
	import { BROWSER } from 'esm-env';
	import { RenderingCancelledException } from 'pdfjs-dist';
	import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
	import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
	import { tick } from 'svelte';
	import TextLayer from './TextLayer.svelte';
	import AnnotLayer from './AnnotLayer.svelte';
</script>

<script lang="ts">
	let {
		page,
		viewport,
		rotation = 0,
		render_text_layer,
		render_annotation_layer = true,
		imageResourcePath = "",
		canvasStyles = '',
		onpagerendersuccess,
		onpagerendererror
	}: {
		page: PDFPageProxy;
		viewport: PageViewport;
		rotation?: number;
		render_text_layer: boolean;
		render_annotation_layer?: boolean;
		imageResourcePath?: string;
		canvasStyles?: string;
		onpagerendersuccess?: (page: PDFPageProxy) => void;
		onpagerendererror?: (err: unknown) => void;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	let render_task: RenderTask | undefined = $state();
	let rendering = $state(false);
	let lastViewportId = $state<string>('');
	
	// High-DPI support
	let dpr = $state(1);
	$effect(() => {
		if (BROWSER) {
			dpr = window.devicePixelRatio || 1;
		}
	});

	const canvasWidth = $derived(viewport ? Math.floor(viewport.width * dpr) : 0);
	const canvasHeight = $derived(viewport ? Math.floor(viewport.height * dpr) : 0);

	async function render_page() {
		if (!canvas || rendering) return;
		rendering = true;
		render_task?.cancel();
		await tick();
		
		const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
		
		render_task = page.render({
			canvasContext: canvas.getContext('2d')!,
			viewport,
			transform
		});

		try {
			await render_task.promise;
			onpagerendersuccess?.(page);
		} catch (err) {
			if (!(err instanceof RenderingCancelledException)) {
				onpagerendererror?.(err);
				throw err;
			}
		} finally {
			rendering = false;
		}
	}

	// Create a stable ID for viewport to prevent unnecessary re-renders
	// Include rotation and DPR in the ID to ensure re-render when they change
	const viewportId = $derived(viewport ? `${viewport.width}x${viewport.height}x${viewport.scale}x${rotation}x${dpr}` : '');

	$effect(() => {
		// Only render if viewport actually changed
		const currentId = viewportId;
		if (viewport && canvas && !rendering && currentId && currentId !== lastViewportId) {
			lastViewportId = currentId;
			render_page();
		}
	});
</script>

<div style:--scale-factor={viewport?.scale ?? null}>
	<canvas
		bind:this={canvas}
		width={canvasWidth}
		height={canvasHeight}
		style:width="{viewport?.width}px"
		style:height="{viewport?.height}px"
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
		/* Canvas dimensions are set via width/height attributes */
		/* Don't override with CSS to maintain aspect ratio */
	}
</style>
