<!-- @component
Render a page from a PDF document. Must be a child of a `Document` component.
 -->

<!--
	@todo Immutable could be a bad idea since it would not update 
	for getViewport functions that are defined inline
	when their dependencies change.
 -->
<script lang="ts" module>
	import type { CalcViewport, MultipleOf90 } from '$lib/utils/target_dimension.js';
	import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
	import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
	import { getContext, onDestroy, untrack } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { BROWSER } from 'esm-env';
</script>

<script lang="ts">
	// #region props
	let {
		/**
		 * What renderer implementation to use for the page.
		 * SVG rendering not implemented yet.
		 * @default {"canvas"}
		 */
		renderer = 'canvas',
		/**
		 * The page number to show.
		 */
		num,
		/**
		 * The scale to show the PDF at.
		 * @default {1}
		 */
		scale = 1,
		/**
		 * Rotate the page by a multiple of 90 degrees.
		 * @default {0}
		 */
		rotation = 0,
		/**
		 * Render a separate text layer (only for the canvas renderer.)
		 * @default {false}
		 */
		renderTextLayer = false,
		/**
		 * Render a separate annotation layer (only for the canvas renderer.)
		 * @default {false}
		 */
		renderAnnotationLayer = false,
		/**
		 * Path for the svg icons that the annotation layer use
		 * @default {""}
		 */
		imageResourcesPath = "",
		/**
		 * A callback invoked with the current page used to determine the viewport.
		 * Use this if you need something more complicated than the default based on scale.
		 */
		getViewport = undefined,
		/** Callback when a page is successfully rendered. */
		onpagerendersuccess,
		/** Callback when there's an error rendering the page. */
		onpagerendererror
	}: {
		renderer?: 'canvas' | 'svg';
		num: number;
		scale?: number;
		rotation?: MultipleOf90;
		renderTextLayer?: boolean;
		renderAnnotationLayer?: boolean;
		imageResourcesPath?: string;
		getViewport?: CalcViewport | undefined;
		onpagerendersuccess?: (page: PDFPageProxy) => void;
		onpagerendererror?: (err: unknown) => void;
	} = $props();
	// #endregion props

	onDestroy(() => page?.cleanup());

	const current_doc: Writable<PDFDocumentProxy | null> = getContext('svelte_pdfjs_doc');

	let page: PDFPageProxy | undefined = $state();

	/* <========================================================================================> */

	let loadingPage = $state(false);
	let lastPageNum = $state(0);
	
	$effect(() => {
		const pageNum = num;
		const isLoading = untrack(() => loadingPage);
		const lastNum = untrack(() => lastPageNum);
		
		if (BROWSER && $current_doc && pageNum && pageNum !== lastNum && !isLoading) {
			untrack(() => {
				loadingPage = true;
				lastPageNum = pageNum;
			});
			
			// Clean up previous page
			const prevPage = untrack(() => page);
			if (prevPage) {
				prevPage.cleanup();
			}
			page = undefined;
			
			// Load new page
			$current_doc.getPage(pageNum).then((p: PDFPageProxy) => {
				page = p;
				loadingPage = false;
			}).catch(() => {
				loadingPage = false;
			});
		}
	});

	// Use $derived for viewport - this is the safest approach, no infinite loops
	const viewport = $derived.by(() => {
		if (!BROWSER || !page) return undefined;
		const viewportFn = getViewport ?? ((p: PDFPageProxy, r: MultipleOf90) => p.getViewport({ scale, rotation: r }));
		return viewportFn(page, rotation);
	});
</script>

{#if page && viewport}
	{#await renderer === 'canvas' ? import('./PageInternals/PageCanvas.svelte') : Promise.reject('SVG rendering not implemented yet.') then { default: Component }}
		<Component
			{page}
			{viewport}
			{rotation}
			render_text_layer={renderer === 'canvas' ? renderTextLayer : false}
			render_annotation_layer={renderer === 'canvas' ? renderAnnotationLayer : false}
			imageResourcePath={imageResourcesPath}
			onpagerendersuccess={onpagerendersuccess}
			onpagerendererror={onpagerendererror}
		/>
	{/await}
{/if}
