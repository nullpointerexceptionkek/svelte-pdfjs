<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type { PageViewport, PDFPageProxy, TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs';
	import 'pdfjs-dist/legacy/web/pdf_viewer.css';
	import { untrack } from 'svelte';

	interface Props {
		page: PDFPageProxy;
		viewport: PageViewport;
	}

	let { page, viewport }: Props = $props();

	let render_task: TextLayer;
	let container: HTMLDivElement | undefined = $state();
	let render_version = 0;

	async function render_text_layer(_page: PDFPageProxy, _viewport: PageViewport, _container: HTMLDivElement) {
		const my_version = ++render_version;
		
		_container.textContent = '';
		const {TextLayer} = await import('pdfjs-dist/legacy/build/pdf.mjs');

		render_task?.cancel();
		
		if (my_version !== render_version) return;
		
		render_task = new TextLayer({
			container: _container,
			textContentSource: _page.streamTextContent(),
			viewport: _viewport,
		});
		try {
			await render_task.render();
		} catch (err: any) {
			throw err;
		}
	}

	$effect(() => {
		const _page = page;
		const _viewport = viewport;
		const _container = container;
		if (BROWSER && _page && _viewport && _container) {
			untrack(() => render_text_layer(_page, _viewport, _container));
		}
	});
</script>

<div class="textLayer" bind:this={container}></div>