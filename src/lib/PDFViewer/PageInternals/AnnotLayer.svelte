<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type {
		PageViewport,
		PDFPageProxy,
		AnnotationLayer,
	} from 'pdfjs-dist/legacy/build/pdf.mjs';
	import { PDFLinkService } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
	export let page: PDFPageProxy;
	export let viewport: PageViewport;

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
		});
	}

	$: if (BROWSER && container && viewport) render_annotation_layer();
</script>

<div id="annotation-layer" bind:this={container} />

<style>
	#annotation-layer {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		overflow: hidden;
		opacity: 0.2;
		line-height: 1;
	}

	#annotation-layer > section {
		color: transparent;
		position: absolute;
		white-space: pre;
		cursor: text;
		transform-origin: 0% 0%;
	}

	#annotation-layer > .linkAnnotation > a {
		position: absolute;
		font-size: 1em;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>
