<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type { PageViewport, PDFPageProxy, TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs';
	import '$lib/css/TextLayer.css'

	export let page: PDFPageProxy;
	export let viewport: PageViewport;

	let render_task: TextLayer;
	let container: HTMLDivElement;

	
	async function render_text_layer() {
		container.textContent = '';
		const {TextLayer} = await import('pdfjs-dist/legacy/build/pdf.mjs');

		render_task?.cancel();
		render_task = new TextLayer({
			container,
			textContentSource: page.streamTextContent(),
			viewport,
		});
		await render_task.render();
	}

	$: if (BROWSER && container && viewport) render_text_layer();
</script>

<div class="textLayer" bind:this={container} />

