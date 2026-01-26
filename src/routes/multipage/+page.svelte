<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { Document, Page, preferThisWidth } from 'svelte-pdfjs';

	let max_pages: number = $state(0);
</script>

{#if browser}
	<Document
		file="{base}/tackling-ts-preview-book.pdf"
		loadOptions={{ docBaseUrl: base }}
		onloadsuccess={(doc: any) => console.log((max_pages = doc.numPages))}
		onloaderror={console.log}
	>
		{#each Array(max_pages) as _, i}
			<div>
				<Page num={i + 1} getViewport={preferThisWidth(500)} renderTextLayer />
			</div>
		{/each}
	</Document>
{/if}

<style>
	div {
		display: grid;
		place-items: center;
	}
</style>
