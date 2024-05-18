import {
	assign,
	eachArray,
	hasLength,
	hasValue,
	isArray,
	isBuffer,
	isString,
	isTrue,
	isUndefined,
	noValue
} from '@universalweb/acid';
import { decode, encode, } from '#utilities/serialize';
import {
	failed,
	imported,
	info,
	msgReceived,
	msgSent,
	success
} from '#logs';
import { createClient } from '../server/clients/index.js';
import { toBase64 } from '#crypto';
/**
	* @TODO
	* Add support to block connection Ids that are too large
	* Add support to block connection Ids that are too small
 */
export async function decodePacketHeaders(config) {
	const {
		source,
		destination,
		packet: packetEncoded
	} = config;
	const {
		cipherSuite,
		state,
		isClient,
		isServer,
		isServerEnd,
		isServerClient,
		boxCryptography,
		connectionIdSize
	} = destination;
	const packetSize = packetEncoded.length;
	if (packetSize > 1280) {
		console.log(packetEncoded);
		console.trace(`WARNING: DECODE Packet size is larger than max allowed size 1280 -> ${packetSize} over by ${packetSize - 1280}`);
	}
	const client = config.client;
	info(`Packet Encoded Size ${packetSize}`);
	const packet = decode(packetEncoded);
	if (isUndefined(packet)) {
		console.trace('Packet decode failed');
		return;
	}
	config.packet = packet;
	info(`Packet Decoded Array Size ${packet.length}`);
	console.log(packet);
	const isShortHeaderMode = isBuffer(packet);
	config.isShortHeaderMode = isShortHeaderMode;
	if (isShortHeaderMode) {
		info(`ShortHeaderMode Size ${packet.length}`);
	}
	let headerEncoded;
	if (isShortHeaderMode) {
		headerEncoded = packet.subarray(0, connectionIdSize);
	} else {
		headerEncoded = packet[0];
	}
	info(`headerEncoded Size ${headerEncoded.length}`);
	if (!headerEncoded) {
		return console.trace(`No header encoded -> Invalid Packet`);
	}
	config.headerEncoded = headerEncoded;
	// Add single header support which holds only the binary data of the packet.id
	const headerDecoded = headerEncoded;
	if (isUndefined(headerDecoded)) {
		return console.trace(`No header from decode -> Invalid Packet`);
	}
	const id = isShortHeaderMode ? headerDecoded : headerDecoded[0];
	if (isClient) {
		console.log(`Decode destination ID: ${destination?.id?.toString('hex')}`);
		console.log(`Decode source ID: ${source?.id?.toString('hex')}`);
	} else {
		console.log(`Decode Server side packet with id: ${id.toString('hex')}`);
	}
	config.packetDecoded = {
		header: headerDecoded,
		id
	};
	if (!isShortHeaderMode) {
		const headerRPC = headerDecoded[1];
		if (hasValue(headerRPC)) {
			config.packetDecoded.headerRPC = headerRPC;
		}
		if (headerRPC === 0) {
			success(`Public Key is given -> Processing as create client`);
			const key = headerDecoded[2];
			if (!key) {
				return console.trace('No Client Key provided', headerDecoded);
			}
			config.packetDecoded.key = key;
		}
	}
	return config;
}
export async function decodePacket(config) {
	const {
		source,
		destination,
		packet,
		packetDecoded,
		packetDecoded: { header, },
		headerEncoded,
		isShortHeaderMode,
	} = config;
	const {
		cipherSuite,
		connectionIdSize,
	} = destination;
	let messageEncoded;
	if (isShortHeaderMode) {
		messageEncoded = packet.subarray(connectionIdSize);
	} else {
		messageEncoded = packet[1];
	}
	if (noValue(messageEncoded)) {
		console.log('No message encoded');
		return true;
	}
	const receiveKey = destination?.receiveKey;
	info(`Receive Key ${toBase64(receiveKey)}`);
	if (messageEncoded && isBuffer(messageEncoded) && hasLength(messageEncoded)) {
		console.log(packet, packetDecoded);
		if (receiveKey) {
			info(`encrypted Message size ${messageEncoded.length}bytes`);
			const ad = isShortHeaderMode ? headerEncoded : encode(headerEncoded);
			console.log('cipherSuite', cipherSuite);
			const decryptedMessage = cipherSuite.decrypt(messageEncoded, receiveKey, ad);
			if (isUndefined(decryptedMessage)) {
				console.trace('Decryption failed');
				return;
			}
			info(`decrypted Message size ${decryptedMessage.length} BYTES`);
			const message = decode(decryptedMessage);
			if (isUndefined(message)) {
				console.trace('No Message in Packet');
			}
			packetDecoded.message = message;
		}
	} else {
		console.trace(`No Message in Packet`);
	}
	return true;
}
