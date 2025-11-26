<script lang="ts">
	import { BROWSER } from 'esm-env';
	import type {
		PageViewport,
		PDFPageProxy,
		AnnotationLayer,
	} from 'pdfjs-dist/legacy/build/pdf.mjs';
	import { PDFLinkService } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
	import 'pdfjs-dist/legacy/web/pdf_viewer.css';
	import { untrack } from 'svelte';

	interface Props {
		page: PDFPageProxy;
		viewport: PageViewport; 
		imageResourcePath: string;
	}

	let { page, viewport, imageResourcePath }: Props = $props();
	let linkService: PDFLinkService;
	let container: HTMLDivElement | undefined = $state();
	let render: AnnotationLayer;
	let render_version = 0;

	// Mock viewer object for PDFLinkService (required in pdfjs-dist v5+)
	const mockViewer = {
		scrollPageIntoView: ({ pageNumber }: { pageNumber: number }) => {
			// Could dispatch an event here if needed
			console.log('scrollPageIntoView', pageNumber);
		},
	};

	async function initializeLinkService(_page: PDFPageProxy) {
		linkService = new PDFLinkService();
		// @ts-expect-error - _pdfDocument is an internal property
		linkService.setDocument(_page._pdfDocument);
		linkService.setViewer(mockViewer);
	}

	async function render_annotation_layer(_page: PDFPageProxy, _viewport: PageViewport, _container: HTMLDivElement, _imageResourcePath: string) {
		const my_version = ++render_version;
		
		_container.textContent = '';
		const { AnnotationLayer } = await import(
			'pdfjs-dist/legacy/build/pdf.mjs'
		);

		if (my_version !== render_version) return;

        await initializeLinkService(_page);

		if (my_version !== render_version) return;

		const annotations = await _page.getAnnotations({ intent: 'display' });

		if (my_version !== render_version) return;

		render = new AnnotationLayer({
			div: _container,
			// accessibilityManager: any,
			// annotationCanvasMap: any,
			// annotationEditorUIManager: any,
			page: _page,
			viewport: _viewport,
		} as never);
		render.render({
			annotations,
			viewport: _viewport,
			div: _container,
			page: _page,
			linkService: linkService,
			renderForms: false,
            imageResourcesPath: _imageResourcePath,
		});
	}

	$effect(() => {
		const _page = page;
		const _viewport = viewport;
		const _container = container;
		const _imageResourcePath = imageResourcePath;
		if (BROWSER && _page && _viewport && _container) {
			untrack(() => render_annotation_layer(_page, _viewport, _container, _imageResourcePath));
		}
	});
</script>

<div class="annotationLayer" bind:this={container}></div>