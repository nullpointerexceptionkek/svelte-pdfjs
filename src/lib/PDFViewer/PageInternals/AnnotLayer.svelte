<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type {
		PageViewport,
		PDFPageProxy,
		AnnotationLayer,
	} from 'pdfjs-dist/legacy/build/pdf.mjs';
	import { PDFLinkService } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
    import '$lib/css/AnnotationLayer.css'

	export let page: PDFPageProxy;
	export let viewport: PageViewport; 
    export let imageResourcePath: string;
	let linkService: PDFLinkService;
	let container: HTMLDivElement;
	let render: AnnotationLayer;

	async function initializeLinkService() {
		linkService = new PDFLinkService();
		linkService.setDocument(page._pdfDocument);
		linkService.setViewer(null);//no full viewer
	}

	async function render_annotation_layer() {
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

	$: if (BROWSER && container && viewport) render_annotation_layer();
</script>

<div class="annotationLayer" bind:this={container} />
