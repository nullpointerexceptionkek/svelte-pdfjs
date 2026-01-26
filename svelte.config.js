import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			precompress: true,
		}),

		alias: {
			'svelte-pdfjs': 'src/lib/index.js',
			'svelte-pdfjs/*': 'src/lib/*',
		},

		paths: {
			base: process.env.BASE_PATH,
		},
	},
};

export default config;
