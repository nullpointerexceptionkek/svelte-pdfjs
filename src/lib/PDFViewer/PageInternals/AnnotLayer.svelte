<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type {
		PageViewport,
		PDFPageProxy,
		AnnotationLayer,
	} from 'pdfjs-dist/legacy/build/pdf.mjs';
	import { PDFLinkService } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
    import '$lib/css/AnnotationLayer.css'

	let { page, viewport, imageResourcePath }: { 
		page: PDFPageProxy; 
		viewport: PageViewport; 
		imageResourcePath: string;
	} = $props();
	
	let linkService: PDFLinkService | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let render: AnnotationLayer | undefined = $state();
	let rendering = $state(false);
	let lastViewportId = $state<string>('');

	async function initializeLinkService() {
		linkService = new PDFLinkService();
		linkService.setDocument((page as any)._pdfDocument);
		linkService.setViewer(null);//no full viewer
	}

	async function render_annotation_layer() {
		if (!container || rendering) return;
		rendering = true;
		container.textContent = '';
		const { AnnotationLayer } = await import(
			'pdfjs-dist/legacy/build/pdf.mjs'
		);

        await initializeLinkService();

		const annotations = await page.getAnnotations({ intent: 'display' });

		render = new AnnotationLayer({
			div: container,
			// accessibilityManager: any,
			// annotationCanvasMap: any,
			// annotationEditorUIManager: any,
			page: page,
			viewport: viewport,
		} as never);
		if (render && linkService) {
			render.render({
				annotations,
				viewport: viewport,
				div: container,
				page: page,
				linkService: linkService,
				renderForms: false,
				imageResourcesPath: imageResourcePath,
			});
		}
		rendering = false;
	}

	const viewportId = $derived(`${viewport.width}x${viewport.height}x${viewport.scale}`);

	$effect(() => {
		const currentId = viewportId;
		if (BROWSER && container && viewport && !rendering && currentId && currentId !== lastViewportId) {
			lastViewportId = currentId;
			render_annotation_layer();
		}
	});
</script>

<div class="annotationLayer" bind:this={container}></div>
