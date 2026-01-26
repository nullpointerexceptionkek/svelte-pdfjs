import type { RequestHandler } from './$types.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async ({ params }: { params: { filename: string } }) => {
	try {
		const { filename } = params;
		
		// Security: prevent directory traversal
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return new Response('Invalid filename', { status: 400 });
		}

		const filepath = join(UPLOAD_DIR, filename);

		// Check if file exists
		if (!existsSync(filepath)) {
			return new Response('File not found', { status: 404 });
		}

		// Read and return the file
		const fileBuffer = await readFile(filepath);
		
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${filename}"`,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error serving uploaded PDF:', error);
		return new Response('Failed to serve file', { status: 500 });
	}
};

