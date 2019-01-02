/* global JSZip, Windows, nw */
/* eslint-env node */
/* eslint-disable global-require */

import 'https://unpkg.com/jszip/dist/jszip.min.js';
import {directorySavePath} from './dom-manipulation.js';

const bundleFiles = async (files) => {
	const zipFile = new JSZip();
	const spritesFolder = zipFile.folder('Sprites');
	const compressOptions = {type: 'blob', compression: 'DEFLATE', compressionOptions: {level: 7}};

	files.forEach((file, index) => {
		spritesFolder.file(file.name || `Sprite ${index.toString().padStart(2, '0')}.png`, file);
	});

	if (JSZip.support.nodestream) {
		const bundleStream = [zipFile.generateNodeStream(Object.assign(compressOptions, {type: 'nodebuffer', streamFiles: true}))];
		bundleStream.name = 'Sprites.zip';

		files = [bundleStream];
	} else {
		try {
			files = [new File([await zipFile.generateAsync(compressOptions)], 'Sprites.zip', {type: 'application/zip'})];
		} catch (err) { //eslint-disable-line
			const bundle = new Blob(await zipFile.generateAsync(compressOptions), {type: 'application/zip'});
			bundle.name = 'Sprites.zip';
			bundle.lastModified = Date.now();
			bundle.lastModifiedDate = new Date(bundle.lastModified);
			bundle.webkitRelativePath = '';

			files = [bundle];
		}
	}

	return files;
};

let saveFiles = async (files, options) => {
	if (options.bundleFiles && files.length > 1) {
		files = await bundleFiles(files);
	}

	const downloadLink = document.createElement('a');

	files.forEach((file, index) => {
		downloadLink.download = file.name || `Sprite ${index.toString().padStart(2, '0')}.png`;
		downloadLink.href = URL.createObjectURL(file);
		downloadLink.click();
	});

	URL.revokeObjectURL(downloadLink.href);
	downloadLink.remove();
};

if (typeof Windows !== 'undefined') {
	//UWP
	saveFiles = async (files, options) => {
		if (options.bundleFiles && files.length > 1) {
			files = await bundleFiles(files);
		}

		//TODO: fix file permissions errors!
		// const folder = await Windows.Storage.StorageFolder.getFolderFromPathAsync(document.getElementById('option-filelocation').value);
		const folder = Windows.Storage.DownloadsFolder;

		files.forEach(async (file) => {
			const fsFile = await folder.createFileAsync(file.name, Windows.Storage.CreationCollisionOption.generateUniqueName);

			file.msDetachStream();

			await Windows.Storage.Streams.RandomAccessStream.copyAsync(file, await fsFile.openAsync(Windows.Storage.FileAccessMode.readWrite));
		});
	};
} else if (typeof require === 'function' && ((process && process.versions && process.versions.electron) || typeof nw === 'object')) {
	//Electron/NWJS
	//TODO: add option to always ask where to save files.
	saveFiles = async (files, options) => {
		const {writeFile, createWriteStream} = require('fs');
		const {join} = require('path');

		if (options.bundleFiles && files.length > 1) {
			files = await bundleFiles(files[0]);
		}

		files.forEach(async (file) => {
			await new Promise((resolve, reject) => {
				if (typeof file.pipe === 'function') {
					file.pipe(createWriteStream(file.name)).on('finish', resolve).on('error', reject);
				} else {
					const fileReader = new FileReader();
					fileReader.addEventListener('load', (buffer) => {
						buffer = new Buffer(buffer.target.result);

						if (directorySavePath) {
							file.path = join(directorySavePath, file.name);
						} else {
							file.path = join(process.pwd(), file.name);
						}

						writeFile(file.path, buffer, (err) => {
							if (err) {
								return reject(err);
							}

							return resolve();
						});
					});

					fileReader.readAsArrayBuffer(file);
				}
			});
		});
	};
} else if (navigator.msSaveOrOpenBlob) {
	//IE/Edge
	saveFiles = async (files, options) => {
		if (options.bundleFiles && files.length > 1) {
			files = bundleFiles(files);
		}

		files.forEach((file, index) => {
			navigator.msSaveOrOpenBlob(file, file.name || `Sprite ${index.toString().padStart(2, '0')}.png`);
		});
	};

	if (!HTMLCanvasElement.prototype.toBlob) {
		/*eslint-disable prefer-reflect*/
		Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
			value: function(callback){
				callback(this.msToBlob());
			}
		});
		/*eslint-enable prefer-reflect*/
	}
}

export {saveFiles};