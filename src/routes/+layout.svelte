<script lang="ts">
	import { set_pdfjs_context } from 'svelte-pdfjs/utils/vite.js';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
	

	set_pdfjs_context();
</script>

{@render children?.()}
