<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';

	import { Document, Page, type MultipleOf90 } from 'svelte-pdfjs';

	let scale = $state(1);
	// Support both static PDFs and uploaded PDFs
	// If filename starts with 'uploaded:', it's from the uploads directory
	// Otherwise, it's from the static directory
	// Default to a test PDF if available, otherwise null (will show upload prompt)
	let filename = $state<string | null>('pdf_commenting_new.pdf');
	let max_pages = $state(0);
	let current_page = $state(1);
	let renderTextLayer = $state(false);
	let renderAnnotationLayer = $state(false);
	let rotation: MultipleOf90 = $state(0);
	const imageResourcesPath = `/pdfjsicons/`;
	
	// Upload state
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let uploadedPdfs = $state<Array<{ filename: string; originalName: string; size: number; uploadedAt: string }>>([]);
	
	// Load uploaded PDFs on mount
	$effect(() => {
		if (browser) {
			fetch('/api/uploaded-pdfs')
				.then(res => res.json())
				.then(data => {
					if (data.files) {
						uploadedPdfs = data.files.map((f: any) => ({
							filename: f.filename,
							originalName: f.filename.split('_').slice(1).join('_').replace(/^[0-9]+_/, ''),
							size: f.size,
							uploadedAt: f.uploadedAt
						}));
					}
				})
				.catch(err => console.error('Failed to load uploaded PDFs:', err));
		}
	});
	
	// Get the file URL based on filename
	const fileUrl = $derived(() => {
		if (!filename) return null;
		if (filename.startsWith('uploaded:')) {
			const uploadedFilename = filename.replace('uploaded:', '');
			return `/api/uploaded-pdfs/${uploadedFilename}`;
		}
		return `${base}/${filename}`;
	});
	
	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		
		uploading = true;
		uploadError = null;
		
		const formData = new FormData();
		formData.append('file', file);
		
		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Upload failed');
			}
			
			// Add to uploaded PDFs list
			uploadedPdfs = [{
				filename: result.filename,
				originalName: result.originalName,
				size: result.size,
				uploadedAt: new Date().toISOString()
			}, ...uploadedPdfs];
			
			// Reset page state before loading new PDF
			max_pages = 0;
			current_page = 1;
			
			// Automatically load the uploaded PDF
			filename = `uploaded:${result.filename}`;
			
			// Reset input
			input.value = '';
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	// Zoom controls
	const zoomPercentage = $derived(Math.round(scale * 100));
	
	function zoomIn() {
		scale = Math.min(4, scale + 0.1);
	}
	
	function zoomOut() {
		scale = Math.max(0.5, scale - 0.1);
	}

	function goToPage(page: number) {
		const targetPage = Math.max(1, Math.min(max_pages, page));
		current_page = targetPage;
		// Scroll to the page
		const pageElement = document.getElementById(`page-${targetPage}`);
		if (pageElement) {
			pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function nextPage() {
		if (current_page < max_pages) {
			current_page++;
			goToPage(current_page);
		}
	}

	function prevPage() {
		if (current_page > 1) {
			current_page--;
			goToPage(current_page);
		}
	}

	function firstPage() {
		goToPage(1);
	}

	function lastPage() {
		goToPage(max_pages);
	}

	// Update current page based on scroll position using IntersectionObserver
	$effect(() => {
		if (!browser || max_pages === 0) return;
		
		const pages = Array.from(document.querySelectorAll('.page-wrapper'));
		if (pages.length === 0) return;

		// Use IntersectionObserver to detect which page is most visible
		const observer = new IntersectionObserver(
			(entries) => {
				// Find the entry with the highest intersection ratio
				let mostVisible = entries[0];
				for (const entry of entries) {
					if (entry.intersectionRatio > mostVisible.intersectionRatio) {
						mostVisible = entry;
					}
				}
				
				if (mostVisible.isIntersecting && mostVisible.intersectionRatio > 0.5) {
					const pageId = mostVisible.target.id;
					const pageNum = parseInt(pageId.replace('page-', ''));
					if (!isNaN(pageNum) && pageNum !== current_page) {
						current_page = pageNum;
					}
				}
			},
			{
				threshold: [0, 0.25, 0.5, 0.75, 1],
				rootMargin: '-20% 0px -20% 0px'
			}
		);

		pages.forEach((page) => observer.observe(page));
		
		return () => {
			pages.forEach((page) => observer.unobserve(page));
		};
	});
</script>

<div class="pdf-viewer">
	<header class="toolbar">
		<div class="toolbar-section">
			<div class="page-navigation">
				<button class="toolbar-button" onclick={firstPage} disabled={current_page <= 1} aria-label="First page">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="11 17 6 12 11 7"></polyline>
						<polyline points="18 17 13 12 18 7"></polyline>
					</svg>
				</button>
				<button class="toolbar-button" onclick={prevPage} disabled={current_page <= 1} aria-label="Previous page">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>
				<div class="page-counter">
					<input 
						type="number" 
						class="current-page" 
						min="1" 
						max={max_pages} 
						value={current_page}
						oninput={(e) => {
							const page = parseInt(e.currentTarget.value);
							if (!isNaN(page)) {
								goToPage(page);
							}
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.currentTarget.blur();
							}
						}}
						aria-label="Current page"
					/>
					<span class="page-separator"> / </span>
					<span class="total-pages">{max_pages}</span>
				</div>
				<button class="toolbar-button" onclick={nextPage} disabled={current_page >= max_pages} aria-label="Next page">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
				<button class="toolbar-button" onclick={lastPage} disabled={current_page >= max_pages} aria-label="Last page">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="13 17 18 12 13 7"></polyline>
						<polyline points="6 17 11 12 6 7"></polyline>
					</svg>
				</button>
			</div>
		</div>

		<div class="toolbar-section">
			<div class="zoom-controls">
				<button class="toolbar-button" onclick={zoomOut} aria-label="Zoom out">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
						<line x1="8" y1="11" x2="14" y2="11"></line>
					</svg>
				</button>
				<div class="zoom-display">{zoomPercentage}%</div>
				<button class="toolbar-button" onclick={zoomIn} aria-label="Zoom in">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
						<line x1="11" y1="8" x2="11" y2="14"></line>
						<line x1="8" y1="11" x2="14" y2="11"></line>
					</svg>
				</button>
			</div>
		</div>

		<div class="toolbar-section">
			<select class="rotation-select" bind:value={rotation} aria-label="Rotation">
				<option value={0}>0°</option>
				<option value={90}>90°</option>
				<option value={180}>180°</option>
				<option value={270}>270°</option>
			</select>
		</div>

		<div class="toolbar-section">
			<label class="upload-button">
				<input
					type="file"
					accept=".pdf,application/pdf"
					onchange={handleFileUpload}
					disabled={uploading}
					style="display: none;"
				/>
				<span class="upload-button-text">{uploading ? 'Uploading...' : 'Upload PDF'}</span>
			</label>
		</div>
	</header>

	{#if uploadError}
		<div class="upload-error">{uploadError}</div>
	{/if}

{#if browser && fileUrl()}
	{#key fileUrl()}
		<Document
			file={fileUrl()!}
			loadOptions={{ docBaseUrl: base }}
			onloadsuccess={(doc: any) => {
				max_pages = doc.numPages;
				current_page = Math.min(current_page, max_pages);
			}}
			onloaderror={(err: any) => {
				console.error('PDF load error:', err);
				// If default PDF fails, clear filename so user can upload
				if (filename && !filename.startsWith('uploaded:')) {
					filename = null;
				}
			}}
		>
			<div class="pdf-container">
				{#each Array(max_pages) as _, i}
					<div class="page-wrapper" id="page-{i + 1}">
						<Page
							num={i + 1}
							{scale}
							{renderTextLayer}
							{renderAnnotationLayer}
							{imageResourcesPath}
							{rotation}
						/>
					</div>
				{/each}
			</div>
		</Document>
	{/key}
{:else if browser}
	<div class="no-pdf-message">
		<p>No PDF loaded. Use the "Upload PDF" button to upload a PDF file.</p>
		<p class="note">Note: The PDFs in the <code>static</code> folder are for testing only and can be deleted.</p>
	</div>
{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #525252;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.pdf-viewer {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #525252;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #3c3c3c;
		border-bottom: 1px solid #2a2a2a;
		padding: 8px 16px;
		gap: 16px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		z-index: 100;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.page-navigation {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.toolbar-button {
		background: transparent;
		border: none;
		color: #e8e8e8;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		border-radius: 4px;
		transition: background-color 0.15s ease;
	}

	.toolbar-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.toolbar-button:active:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
	}

	.toolbar-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.toolbar-button svg {
		stroke: currentColor;
	}

	.page-counter {
		display: flex;
		align-items: center;
		color: #e8e8e8;
		font-size: 13px;
		font-weight: 500;
		margin: 0 8px;
	}

	.current-page {
		background: #1a1a1a;
		border: none;
		color: #ffffff;
		font-size: 13px;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 4px;
		min-width: 28px;
		width: 40px;
		text-align: center;
		font-family: inherit;
		cursor: text;
	}

	.current-page:focus {
		outline: none;
		background: #2a2a2a;
	}

	.page-separator {
		margin: 0 6px;
		color: #b0b0b0;
	}

	.total-pages {
		color: #b0b0b0;
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 0;
		background: #2a2a2a;
		border-radius: 4px;
		border: 1px solid #3a3a3a;
		overflow: hidden;
	}

	.zoom-controls .toolbar-button {
		border-radius: 0;
	}

	.zoom-display {
		background: transparent;
		color: #e8e8e8;
		font-size: 13px;
		font-weight: 500;
		padding: 6px 12px;
		min-width: 56px;
		text-align: center;
		cursor: default;
		font-family: inherit;
	}

	.rotation-select {
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		color: #e8e8e8;
		font-size: 13px;
		padding: 6px 12px;
		cursor: pointer;
		font-family: inherit;
	}

	.rotation-select:focus {
		outline: none;
		border-color: #4a9eff;
	}

	.rotation-select:hover {
		background: #2f2f2f;
	}

	.upload-button {
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		color: #e8e8e8;
		font-size: 13px;
		padding: 6px 12px;
		cursor: pointer;
		font-family: inherit;
		display: inline-block;
		transition: background-color 0.15s ease;
	}

	.upload-button:hover:not(:has(input:disabled)) {
		background: #2f2f2f;
		border-color: #4a9eff;
	}

	.upload-button:has(input:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.upload-button-text {
		pointer-events: none;
	}

	.upload-error {
		background: #d32f2f;
		color: white;
		padding: 8px 16px;
		font-size: 13px;
		text-align: center;
	}

	.no-pdf-message {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #e8e8e8;
		padding: 48px;
		text-align: center;
	}

	.no-pdf-message p {
		margin: 8px 0;
		font-size: 14px;
	}

	.no-pdf-message .note {
		font-size: 12px;
		color: #b0b0b0;
		margin-top: 16px;
	}

	.no-pdf-message code {
		background: #2a2a2a;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 11px;
	}

	.pdf-container {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px;
		gap: 16px;
		background: #525252;
	}

	.page-wrapper {
		display: flex;
		justify-content: center;
		width: 100%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		background: #ffffff;
		border-radius: 2px;
		overflow: visible;
	}

	.page-wrapper :global(> div) {
		display: flex;
		justify-content: center;
		width: fit-content;
		max-width: 100%;
	}
</style>
