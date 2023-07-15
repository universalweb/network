import {
	success,
	failed,
	imported,
	msgSent,
	info
} from '#logs';
import {
	encode,
	decode
} from 'msgpackr';
import {
	assign,
	chunk,
	omit,
	objectSize
} from '@universalweb/acid';
import { toBase64 } from '#crypto';
export async function encodePacket(message, source, destination, headers, footer) {
	success(`PROCESSING ENCODE PACKET`);
	const {
		state,
		isClient,
		isServer,
		isServerEnd,
		isServerClient
	} = source;
	let id = destination.id || source.id;
	if (!id) {
		return console.error(`ID IS'T ASSIGNED`);
	}
	const { cryptography } = source;
	let encryptConnectionId = cryptography.config.encryptConnectionId;
	if (!encryptConnectionId) {
		if (isServerEnd) {
			encryptConnectionId = cryptography.config.encryptClientConnectionId;
		} else {
			encryptConnectionId = cryptography.config.encryptServerConnectionId;
		}
	}
	if (encryptConnectionId) {
		// console.log(destination);
		if (isServerEnd) {
			id = cryptography.encryptClientConnectionId(id, destination.connectionIdKeypair);
		} else {
			id = cryptography.encryptServerConnectionId(id, destination.connectionIdKeypair);
		}
		if (!id) {
			return console.error(`Connection ID Encrypt failed method given ${encryptConnectionId}`);
		}
	}
	let header;
	if (headers && objectSize(headers)) {
		header = headers;
		header.id = id;
	} else {
		header = id;
	}
	// console.log(config);
	message.t = Date.now();
	if (header.key) {
		const {
			encryptClientKey,
			encryptServerKey
		} = cryptography.config;
		if (isClient) {
			if (encryptClientKey) {
				header.key = cryptography.encryptClientKey(header.key, destination.encryptKeypair);
			}
		}
		if (isServerEnd) {
			if (encryptServerKey) {
				header.key = cryptography.encryptServerKey(header.key, destination.encryptKeypair);
			}
		}
	}
	const headerEncoded = encode(header);
	const messageEncoded = encode(message);
	const ad = (footer) ? Buffer.concat([headerEncoded, footer]) : headerEncoded;
	const encryptedMessage = cryptography.encrypt(messageEncoded, source.sessionKeys, ad);
	if (!encryptedMessage) {
		return failed('Encryption failed');
	}
	const packetStructure = [headerEncoded, encryptedMessage];
	if (footer) {
		packetStructure[2] = encode(footer);
	}
	const packetEncoded = encode(packetStructure);
	info(`clientId: ${toBase64(header.id)}`);
	info(`Transmit Key ${toBase64(source.sessionKeys.transmitKey)}`);
	const packetSize = packetEncoded.length;
	console.log('Size Unencrypted', encode([headerEncoded, messageEncoded]).length);
	info(`encoded Packet Size ${packetSize}`);
	if (packetSize >= 1328) {
		console.log(packetEncoded);
		failed(`WARNING: Packet size is larger than max allowed size 1328 -> ${packetSize} over by ${packetSize - 1328}`);
	}
	success(`PROCESSED ENCODE PACKET`);
	return packetEncoded;
}
