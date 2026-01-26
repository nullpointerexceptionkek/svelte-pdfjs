import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async () => {
	try {
		// Check if upload directory exists
		try {
			const files = await readdir(UPLOAD_DIR);
			
			// Get file info for each PDF
			const pdfFiles = await Promise.all(
				files
					.filter(file => file.endsWith('.pdf'))
					.map(async (filename) => {
						const filepath = join(UPLOAD_DIR, filename);
						const stats = await stat(filepath);
						return {
							filename,
							size: stats.size,
							uploadedAt: stats.birthtime
						};
					})
			);

			// Sort by upload date (newest first)
			pdfFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

			return json({ files: pdfFiles });
		} catch (error) {
			// Directory doesn't exist, return empty list
			return json({ files: [] });
		}
	} catch (error) {
		console.error('Error listing uploaded PDFs:', error);
		return json({ error: 'Failed to list uploaded PDFs' }, { status: 500 });
	}
};

