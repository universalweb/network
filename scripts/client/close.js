console.clear();
console.log('STARTING CLIENT');
console.time('Full');
import { client } from '#udsp';
import { currentPath } from '@universalweb/acid';
console.time('Benchmark');
// Universal Web Client Socket
const uwClient = await client({
	destinationCertificate: `${currentPath(import.meta)}/../../serverApp/certs/universal_web-Ephemeral/universal.web-EphemeralPublic.cert`,
	// Load Profile Certificate from Keychain
	keychain: 'Universal Web Profile',
	// Load Profile Certificate from file
	profile: `${currentPath(import.meta)}/../../profiles/default/default-Ephemeral/default-Ephemeral.cert`
});
const connection = await uwClient.connect();
await uwClient.close();
console.timeEnd('Benchmark');
