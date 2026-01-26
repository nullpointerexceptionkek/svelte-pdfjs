import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Upload directory - separate from static so it can be deleted without affecting the viewer
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
	await mkdir(UPLOAD_DIR, { recursive: true });
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file type
		if (file.type !== 'application/pdf') {
			return json({ error: 'Only PDF files are allowed' }, { status: 400 });
		}

		// Validate file size (e.g., max 50MB)
		const MAX_SIZE = 50 * 1024 * 1024; // 50MB
		if (file.size > MAX_SIZE) {
			return json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
		}

		// Generate a unique filename to avoid conflicts
		const timestamp = Date.now();
		const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const filename = `${timestamp}_${sanitizedName}`;
		const filepath = join(UPLOAD_DIR, filename);

		// Convert File to Buffer and save
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await writeFile(filepath, buffer);

		// Return the filename so the client can use it
		return json({ 
			success: true, 
			filename,
			originalName: file.name,
			size: file.size
		});
	} catch (error) {
		console.error('Upload error:', error);
		return json({ error: 'Failed to upload file' }, { status: 500 });
	}
};

