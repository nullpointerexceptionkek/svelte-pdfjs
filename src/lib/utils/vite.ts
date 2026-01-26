import { BROWSER } from 'esm-env';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { onDestroy, setContext } from 'svelte';

export function set_pdfjs_context() {
	if (BROWSER) {
		try {
			const workerUrl = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url);
			console.log('Creating PDF worker with URL:', workerUrl.toString());
			const worker = new pdfjs.PDFWorker({
				port: new Worker(
					workerUrl, { type: 'module' }
				) as unknown as null,
			});
			setContext('svelte_pdfjs_worker', worker);
			onDestroy(() => worker.destroy());
		} catch (e) {
			console.error('Failed to create PDF worker:', e);
		}
	}
}
