# Svelte-pdfjs tutorial

## Introduction

The `Document` and `Page` components are designed to work together to load and display PDF documents in your Svelte application. The `Document` component handles the loading of the PDF file, while the `Page` component renders individual pages from the loaded document.

## Context

We provide utility function to set up the `pdfjs-worker src` :
Example +layout.svelte
```svelte
<script lang="ts">
	import { set_pdfjs_context } from 'svelte-pdfjs/vite';
	
	set_pdfjs_context();
</script>

<slot />
```

If you choose not to use this utility, you will have to set the context manually
```js
setContext('svelte_pdfjs_worker', worker);
```

## Document Component

Renderless component responsible for just loading the document and providing it to
children Page components through the context API.

### Props

- **file** `(string | URL | undefined)`  
  The URL of the file to load.

- **loadOptions** `(DocumentInitParameters | undefined)`  
   Extra options provided to PDFJS.getDocument.
   https://github.com/mozilla/pdf.js/blob/41dab8e7b6c1e2684d4afabb8f02e40a874d8e85/src/display/api.js#L126

  **Example:**

  ```js
  loadOptions={{ docBaseUrl: base }}
  ```

- **onProgress** `((params: OnProgressParameters) => void) | undefined`  
  Callback that fires everytime a part of the PDF is downloaded. Can be useful for showing a progress bar.

### Events

- **loadsuccess** `(CustomEvent<PDFDocumentProxy>)`  
  Dispatched when a document is successfully loaded.
- **loaderror** `(CustomEvent<any>)`  
  Dispatched when there's an error while loading the document.

### Example Usage

```svelte
<script>
  import { Document } from 'svelte-pdfjs';
  let max_pages;
  let num = 1;
  let base = 'https://example.com/pdf-base-url/';
</script>

<Document
  file="path/to/your/document.pdf"
  loadOptions={{ docBaseUrl: base }}
  on:loadsuccess={(e) => {
    max_pages = e.detail.numPages;
    num = Math.min(num, max_pages);
  }}
  on:loaderror={(e) => alert(`Error loading document: ${e.detail}`)}
>
  <!-- Page Component -->
</Document>
```

## Page Component
Render a page from a PDF document. Must be a child of a `Document` component.

### Props

- **renderer** `('canvas' | 'svg')`  
  Specifies the rendering method for the page. Currently, only `'canvas'` is implemented.  
  **Default:** `'canvas'`

- **num** `(number)`  
  The page number to render. Pages are 1-indexed.

- **scale** `(number)`  
  The scale factor for rendering the page. A scale of `1` renders the page at its original size.  
  **Default:** `1`

- **rotation** `(0 | 90 | 180 | 270)`  
  Rotates the page by the specified degrees. Must be a multiple of 90.  
  **Default:** `0`

- **renderTextLayer** `(boolean)`  
  Determines whether to render a separate text layer over the page (only applicable for the `'canvas'` renderer).  
  **Default:** `false`

- **renderAnnotationLayer** `(boolean)`  
  Determines whether to render a separate annotation layer over the page (only applicable for the `'canvas'` renderer).  
  **Default:** `false`

- **imageResourcesPath** `(string)`  
  Path for the svg icons that the annotation layer use  
  **Default:** `""`

- **getViewport** `(CalcViewport | undefined)`  
  A custom function to calculate the viewport for the page rendering. Use this if you need more control over the page dimensions or scaling.

  **Example:**

  ```js
  getViewport={(page, rotation) => page.getViewport({ scale: 2, rotation })}
  ```

### Events

- **pagerendersuccess** `(CustomEvent<PDFPageProxy>)`  
  Dispatched when the page is successfully rendered. The event's `detail` contains the rendered `PDFPageProxy` object.

- **pagerendererror** `(CustomEvent<unknown>)`  
  Dispatched when an error occurs during page rendering. The event's `detail` contains the error information.

### Example Usage

```svelte
<script>
  import { Page } from 'svelte-pdfjs';
  let scale = 1.5;
  let num = 1;
  let rotation = 0;
  let renderTextLayer = true;
  let sizing = 1;
  let target_height = 800;

  function preferThisHeight(height) {
    return (page, rotation) => {
      const viewport = page.getViewport({ scale: 1, rotation });
      const scale = height / viewport.height;
      return page.getViewport({ scale, rotation });
    };
  }
</script>

<Page
  {scale}
  {num}
  {renderTextLayer}
  {rotation}
  getViewport={sizing === 1 ? undefined : preferThisHeight(target_height)}
  on:pagerendersuccess={(e) => console.log('Page rendered:', e.detail)}
  on:pagerendererror={(e) => console.error('Render error:', e.detail)}
/>
```

### Further Example

See [src/routes/+page.svelte](src/routes/+page.svelte), [src/routes/multipage/+page.svelte](src/routes/multipage/+page.svelte), [src/routes/+layout.svelte](src/routes/+layout.svelte)

[Demo](https://gtm-nayan.github.io/svelte-pdfjs)

