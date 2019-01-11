/* global JSZip, Windows, nw */
/* eslint-env node */
/* eslint-disable global-require */

import 'https://unpkg.com/jszip/dist/jszip.min.js';
import {directorySavePath} from './dom-manipulation.js';

//TODO: add writable files & cordova

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

		let folder;

		if (options.askFileLocation) {
			const folderPicker = new Windows.Storage.Pickers.FolderPicker();

			folder = await folderPicker.pickSingleFolderAsync();
		} else {
			//TODO: fix file permissions errors!
			try {
				folder = await Windows.Storage.StorageFolder.getFolderFromPathAsync(document.getElementById('option-filelocation').value);
			} catch (err) {
				// TODO: handle error
				folder = Windows.Storage.DownloadsFolder;
			}
		}


		files.forEach(async (file) => {
			const fsFile = await folder.createFileAsync(file.name, Windows.Storage.CreationCollisionOption.generateUniqueName);

			file.msDetachStream();

			await Windows.Storage.Streams.RandomAccessStream.copyAsync(file, await fsFile.openAsync(Windows.Storage.FileAccessMode.readWrite));
		});
	};
} else if (typeof require === 'function' && ((process && process.versions && process.versions.electron) || typeof nw === 'object')) {
	//Electron/NWJS
	let pickSavePath;

	if (typeof nw === 'object') {
		pickSavePath = async () => {
			// TODO: test
			// document.getElementById('option-filelocation').click();
			// document.getElementById('option-filelocation').dispatchEvent(new Event('click'));

			return document.getElementById('option-filelocation').value || nw.App.dataPath;
		};
	} else {
		pickSavePath = async () => {
			const {app, dialog} = require('electron').remote;
			let path = await dialog.showOpenDialog({
				properties: ['openDirectory']
			});

			try {
				path = path ? path[0] : app.getPath('downloads');
			} catch (err) { //eslint-disable-line
				path = app.getAppPath();
			}

			return path;
		};
	}

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
					fileReader.addEventListener('load', async (buffer) => {
						buffer = new Buffer(buffer.target.result);

						if (options.askFileLocation) {
							//TODO: ask where to save files.
							const folder = await pickSavePath();

							file.path = join(folder, file.name);
						} else if (directorySavePath) {
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