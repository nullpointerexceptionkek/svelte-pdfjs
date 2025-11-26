<!-- @component
Render a page from a PDF document. Must be a child of a `Document` component.
 -->
<!--
	@todo Immutable could be a bad idea since it would not update 
	for getViewport functions that are defined inline
	when their dependencies change.
 -->
<script module lang="ts">
	import type { CalcViewport, MultipleOf90 } from '$lib/utils/target_dimension.js';
	import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
	import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
	import { getContext, onDestroy, untrack } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { BROWSER } from 'esm-env';
</script>

<script lang="ts">
	interface Props {
		/**
		 * What renderer implementation to use for the page.
		 * SVG rendering not implemented yet.
		 * @default {"canvas"}
		 */
		renderer?: 'canvas' | 'svg';
		/**
		 * The page number to show.
		 */
		num: number;
		/**
		 * The scale to show the PDF at.
		 * @default {1}
		 */
		scale?: number;
		/**
		 * Rotate the page by a multiple of 90 degrees.
		 * @default {0}
		 */
		rotation?: MultipleOf90;
		/**
		 * Render a separate text layer (only for the canvas renderer.)
		 * @default {false}
		 */
		renderTextLayer?: boolean;
		/**
		 * Render a separate annotation layer (only for the canvas renderer.)
		 * @default {false}
		 */
		renderAnnotationLayer?: boolean;
		/**
		 * Path for the svg icons that the annotation layer use
		 * @default {""}
		 */
		imageResourcesPath?: string;
		/**
		 * A callback invoked with the current page used to determine the viewport.
		 * Use this if you need something more complicated than the default based on scale.
		 */
		getViewport?: CalcViewport | undefined;
		/** Callback when page renders successfully. */
		onpagerendersuccess?: (page: PDFPageProxy) => void;
		/** Callback when there's an error rendering the page. */
		onpagerendererror?: (err: unknown) => void;
	}

	let {
		renderer = 'canvas',
		num,
		scale = 1,
		rotation = 0,
		renderTextLayer = false,
		renderAnnotationLayer = false,
		imageResourcesPath = "",
		getViewport = undefined,
		onpagerendersuccess,
		onpagerendererror
	}: Props = $props();

	onDestroy(() => page?.cleanup());

	const current_doc: Writable<PDFDocumentProxy> = getContext('svelte_pdfjs_doc');

	let page: PDFPageProxy | undefined = $state();
	let viewport: PageViewport | undefined = $state();

	/* <========================================================================================> */

	$effect(() => {
		const doc = $current_doc;
		const _num = num;
		if (BROWSER && doc) {
			untrack(() => doc.getPage(_num).then((p: PDFPageProxy) => (page = p)));
		}
	});

	let _get_viewport: CalcViewport = $derived(
		getViewport ?? ((p, r) => p.getViewport({ scale, rotation: r }))
	);

	$effect(() => {
		const _page = page;
		const _rotation = rotation;
		const _getViewport = _get_viewport;
		if (BROWSER && _page) {
			viewport = _getViewport(_page, _rotation);
		}
	});
</script>

{#await renderer === 'canvas' ? import('./PageInternals/PageCanvas.svelte') : Promise.reject('SVG rendering not implemented yet.') then { default: PageCanvas }}
	<PageCanvas
		{page}
		{viewport}
		render_text_layer={renderer === 'canvas' ? renderTextLayer : false}
		render_annotation_layer={renderer === 'canvas' ? renderAnnotationLayer : false}
		imageResourcePath={imageResourcesPath}
		{onpagerendersuccess}
		{onpagerendererror}
	/>
{/await}
