console.clear();
console.log('STARTING CLIENT');
console.time('Full');
import { currentPath } from '@universalweb/acid';
import { client } from '#udsp';
import { decode } from 'msgpackr';
console.time('Connected');
// Universal Web Socket
const uwClient = await client({
	destinationCertificate: `${currentPath(import.meta)}/../services/universal.web-EphemeralPublic.cert`,
	// Load Profile Certificate from Keychain
	// keychain: 'Universal Web Profile',
	// Load Profile Certificate from file
	certificate: `${currentPath(import.meta)}/../profiles/default-Ephemeral.cert`,
});
// const connection = await uwClient.connect();
//  await client('universalweb.io', {keychain: 'Universal Web Profile'});
console.timeEnd('Connected');
// console.log('INTRO =>', uwClient);
console.time('FileRequest');
// short hand get request
const fileRequest = await uwClient.request('get', 'index.html');
// medium hand
// const fileRequest = await uwClient.request({
// 	path: 'index.html'
// });
// fileRequest.on({
// 	data(...args) {
// 		console.log('custom onData event', ...args);
// 	},
// 	head(...args) {
// 		console.log('custom onHead event', ...args);
// 	}
// });
// const response = await fileRequest.send();
// console.log(response);
// const response = await uwClient.request('index.html').on({
// 	data(...args) {
// 		console.log('onData for simulate client', ...args);
// 	}
// }).send();
// console.log('head', response.head);
// console.log('data', response.toString());
console.timeEnd('FileRequest');
const fileFetch = await uwClient.fetch('index.html');
console.log(fileFetch.head);
console.log('data', fileFetch.toString());
console.timeEnd('Full');
// console.log('Request state', fileRequest);

