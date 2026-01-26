<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type { PageViewport, PDFPageProxy, TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs';
	import '$lib/css/TextLayer.css'

	let { page, viewport }: { page: PDFPageProxy; viewport: PageViewport } = $props();

	let render_task: TextLayer | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let rendering = $state(false);
	let lastViewportId = $state<string>('');

	async function render_text_layer() {
		if (!container || rendering) return;
		rendering = true;
		container.textContent = '';
		const {TextLayer} = await import('pdfjs-dist/legacy/build/pdf.mjs');

		render_task?.cancel();
		render_task = new TextLayer({
			container,
			textContentSource: page.streamTextContent(),
			viewport,
		});
		await render_task.render();
		rendering = false;
	}

	const viewportId = $derived(`${viewport.width}x${viewport.height}x${viewport.scale}`);

	$effect(() => {
		const currentId = viewportId;
		if (BROWSER && container && viewport && !rendering && currentId && currentId !== lastViewportId) {
			lastViewportId = currentId;
			render_text_layer();
		}
	});
</script>

<div class="textLayer" bind:this={container}></div>

