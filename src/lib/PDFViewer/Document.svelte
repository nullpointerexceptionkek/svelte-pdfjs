<!-- @component
Renderless component responsible for just loading the document and providing it to
children Page components through the context API.
 -->
<script lang="ts" module>
	import { BROWSER } from 'esm-env';
	import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFWorker } from 'pdfjs-dist';
	import type {
		DocumentInitParameters,
		OnProgressParameters,
	} from 'pdfjs-dist/types/src/display/api.js';
	import { getContext, onDestroy, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
</script>

<script lang="ts">
	let {
		/** The URL of the file to load. */
		file = undefined,
		/**
		 * Extra options provided to PDFJS.getDocument.
		 * @see https://github.com/mozilla/pdf.js/blob/41dab8e7b6c1e2684d4afabb8f02e40a874d8e85/src/display/api.js#L126
		 */
		loadOptions = undefined,
		/**
		 * Callback that fires everytime a part of the PDF is downloaded. Can be useful for showing a progress bar.
		 */
		onProgress = undefined,
		/** Callback when a document is successfully loaded. */
		onloadsuccess,
		/** Callback when there's an error while loading the document. */
		onloaderror,
		children
	}: {
		file?: string | URL | undefined;
		loadOptions?: DocumentInitParameters | undefined;
		onProgress?: undefined | ((params: OnProgressParameters) => void);
		onloadsuccess?: (doc: PDFDocumentProxy) => void;
		onloaderror?: (err: unknown) => void;
		children: import('svelte').Snippet;
	} = $props();

	const worker = getContext<PDFWorker | undefined>('svelte_pdfjs_worker');

	let current_doc = writable<PDFDocumentProxy | null>();
	let loading_task: PDFDocumentLoadingTask;
	setContext('svelte_pdfjs_doc', current_doc);

	onDestroy(() => {
		$current_doc?.destroy();
		$current_doc?.cleanup(false);
	});

	let loading = $state(false);
	let lastLoadedFile = $state<string>('');

	async function load_document(fileUrl: string | URL | undefined, options: DocumentInitParameters | undefined) {
		if (loading) return; // Prevent concurrent loads
		
		loading = true;
		const prev_doc = $current_doc;

		current_doc.set(null);

		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		loading_task = getDocument({ url: fileUrl, worker, ...options });
		loading_task.onProgress = onProgress!;
		loading_task.promise
			.then(
				(doc: PDFDocumentProxy) => {
					prev_doc?.destroy();
					prev_doc?.cleanup();
					onloadsuccess?.(doc);
					loading = false;
					return doc;
				},
				(err: unknown) => {
					onloaderror?.(err);
					loading = false;
					return prev_doc;
				}
			)
			.then(current_doc.set);
	}
	
	// Track file as a string to avoid object reference issues
	const fileString = $derived(file?.toString() ?? '');
	
	$effect(() => {
		// Track fileString to detect file changes
		const currentFile = fileString;
		if (!BROWSER || !currentFile) return;
		
		// Use untrack to read other state values without tracking them
		const isLoading = untrack(() => loading);
		const lastFile = untrack(() => lastLoadedFile);
		
		if (currentFile !== lastFile && !isLoading) {
			// Update lastLoadedFile before loading to prevent re-triggering
			untrack(() => {
				lastLoadedFile = currentFile;
			});
			// Capture values using untrack to prevent loadOptions from being tracked
			const fileToLoad = untrack(() => file);
			const optionsToUse = untrack(() => loadOptions);
			load_document(fileToLoad, optionsToUse);
		}
	});
</script>

{@render children()}
