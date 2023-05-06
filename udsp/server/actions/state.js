import { isString, isEmpty } from 'Acid';
import { cleanPath, isPathAllowed } from '#cleanPath';
import { info } from '#logs';
import { read } from '#utilities/file';
export async function state(socket, request, response) {
	const { configuration: { resourceDirectory, }, } = this;
	info(request);
	const { state: fileName } = request.body;
	response.head = {};
	if (!isString(fileName) || isEmpty(fileName)) {
		console.log('No valid state request received - Returning empty data');
		response.head.status = 404;
		return true;
	}
	if (!isPathAllowed(fileName)) {
		response.body = {
			err: 'Invalid path'
		};
		return true;
	}
	const cleanedPath = (fileName) ? cleanPath(`${resourceDirectory}/states/${fileName}/index.js`) : cleanPath(`${resourceDirectory}/states/index.js`);
	const data = await read(cleanedPath);
	console.log(cleanedPath, data);
	response.body = {
		data
	};
	return true;
}
