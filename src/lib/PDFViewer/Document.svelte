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
	interface Props {
		/** The URL of the file to load. */
		file?: string | URL | undefined;
		/**
		 * Extra options provided to PDFJS.getDocument.
		 * @see https://github.com/mozilla/pdf.js/blob/41dab8e7b6c1e2684d4afabb8f02e40a874d8e85/src/display/api.js#L126
		 */
		loadOptions?: DocumentInitParameters | undefined;
		/**
		 * Callback that fires everytime a part of the PDF is downloaded. Can be useful for showing a progress bar.
		 */
		onProgress?: undefined | ((params: OnProgressParameters) => void);
		/** Callback when a document is successfully loaded. */
		onloadsuccess?: (doc: PDFDocumentProxy) => void;
		/** Callback when there's an error while loading the document. */
		onloaderror?: (err: unknown) => void;
		children?: import('svelte').Snippet;
	}

	let {
		file = undefined,
		loadOptions = undefined,
		onProgress = undefined,
		onloadsuccess,
		onloaderror,
		children
	}: Props = $props();

	const worker = getContext<PDFWorker | undefined>('svelte_pdfjs_worker');

	let current_doc = writable<PDFDocumentProxy | null>();
	let loading_task: PDFDocumentLoadingTask;
	setContext('svelte_pdfjs_doc', current_doc);

	onDestroy(() => {
		$current_doc?.destroy();
		$current_doc?.cleanup(false);
	});

	async function load_document(_file: string | URL, _loadOptions: DocumentInitParameters | undefined) {
		const prev_doc = $current_doc;

		current_doc.set(null);

		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		loading_task = getDocument({ url: _file, worker, ..._loadOptions });
		loading_task.onProgress = onProgress!;
		loading_task.promise
			.then(
				(doc: PDFDocumentProxy) => {
					prev_doc?.destroy();
					prev_doc?.cleanup();
					onloadsuccess?.(doc);
					return doc;
				},
				(err: unknown) => {
					onloaderror?.(err);
					return prev_doc;
				}
			)
			.then(current_doc.set);
	}

	$effect(() => {
		const _file = file;
		const _loadOptions = loadOptions;
		if (BROWSER && _file) {
			untrack(() => load_document(_file, _loadOptions));
		}
	});
</script>

{@render children?.()}
