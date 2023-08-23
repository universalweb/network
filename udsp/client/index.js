/*
  	* Client Module
	* UDSP - Universal Data Stream Protocol
	* UW Universal Web
	* uw:// Universal Web Protocol preferred
	* udsp:// UDSP Protocol
	* Establishes a UDP based bi-directional real-time connection between client and server.
*/
// Default System imports
import {
	encode,
	decode
} from 'msgpackr';
import {
	omit,
	assign,
	construct,
	UniqID,
	isString,
	promise,
	isTrue,
	currentPath,
	hasValue,
	isUndefined,
	has,
	intersection
} from '@universalweb/acid';
import dgram from 'dgram';
import { success, configure, info } from '#logs';
import {
	toBase64,
	emptyNonce,
	randomConnectionId,
} from '#crypto';
import { getCertificate, parseCertificate } from '#certificate';
import { watch } from '#watch';
// Client specific imports to extend class
import { emit } from '../requestMethods/emit.js';
import { request } from '#udsp/requestMethods/request';
import { processMessage } from './processMessage.js';
import { onPacket } from './onPacket.js';
import { onListening } from './listening.js';
import { keychainGet } from '#keychain';
import { Ask } from '../request/ask.js';
import { fetchRequest } from '../requestMethods/fetch.js';
import { UDSP } from '#udsp/base';
import { sendPacket } from '../sendPacket.js';
import { post } from '../requestMethods/post.js';
import { getAlgorithm } from '../cryptoMiddleware/index.js';
// UNIVERSAL WEB Client Class
export class Client extends UDSP {
	constructor(configuration) {
		super();
		console.log('-------CLIENT INITIALIZING-------\n');
		return this.initialize(configuration);
	}
	description = `The Universal Web's UDSP client module to initiate connections to a UDSP Server.`;
	type = 'client';
	isClient = true;
	configDefaults() {
		const {
			autoConnect,
			realtime
		} = this.configuration;
		this.autoConnect = autoConnect;
		this.realtime = realtime;
	}
	async setDestination() {
		const {
			destination,
			configuration: {
				ip,
				port,
				destinationCertificate
			}
		} = this;
		if (isString(destinationCertificate)) {
			// console.log('Loading Destination Certificate', destinationCertificate);
			const certificate = await getCertificate(destinationCertificate);
			assign(destination, certificate);
			this.hasCertificate = true;
		}
		if (!destination.publicKey) {
			console.log('No destination certificate provided.');
		}
		if (ip) {
			destination.ip = ip;
		}
		if (port) {
			destination.port = port;
		}
		// console.log('Destination', destination.cryptography);
	}
	async getKeychainSave(keychain) {
		return keychainGet(keychain);
	}
	async setCertificate() {
		const {
			keychain,
			certificate
		} = this.configuration;
		if (isString(certificate)) {
			this.certificate = await parseCertificate(certificate);
		}
		if (keychain) {
			// console.log('Loading Keychain', keychain);
			this.certificate = await this.getKeychainSave(keychain);
		}
	}
	async configCryptography() {
		// console.log(this.cryptography);
		const { destination, } = this;
		const {
			encryptClientConnectionId,
			encryptServerConnectionId,
			encryptConnectionId,
			publicKeyAlgorithm,
		} = destination;
		if (!has(destination.cipherSuites, this.cipherSuiteName)) {
			console.log('Default ciphersuite not available');
			this.cipherSuiteName = intersection(this.cipherSuites, destination.cipherSuites)[0];
			if (!this.cipherSuiteName) {
				console.log('No matching cipher suite found.');
				return false;
			}
		}
		this.publicKeyCryptography = getAlgorithm(publicKeyAlgorithm);
		this.cipherSuite = getAlgorithm(this.cipherSuiteName);
		this.boxCryptography = getAlgorithm('x25519-xsalsa20-poly1305');
		this.compression = destination.compression;
		this.headerCompression = destination.headerCompression;
		if (destination.autoLogin && this.autoLogin) {
			this.autoLogin = true;
		}
		if (!this.keypair) {
			this.keypair = this.publicKeyCryptography.keypair();
			success(`Created Connection Keypair`);
		}
		if (!this.encryptionKeypair) {
			this.encryptionKeypair = this.keypair;
		}
		if (encryptClientConnectionId || encryptServerConnectionId || encryptConnectionId) {
			this.connectionIdKeypair = this.keypair;
		}
		await this.setSessionKeys();
	}
	async attachEvents() {
		const thisClient = this;
		this.socket.on('error', (err) => {
			console.log('CLIENT UDP SERVER ERROR');
			return thisClient.onError && thisClient.onError(err);
		});
		this.socket.on('listening', () => {
			return thisClient.onListening();
		});
		this.socket.on('message', (packet, rinfo) => {
			return thisClient.onPacket(packet, rinfo);
		});
	}
	async initialize(configuration) {
		const thisClient = this;
		this.configuration = configuration;
		const { id } = this.configuration;
		this.id = id || randomConnectionId();
		this.idString = toBase64(this.id);
		this.clientId = this.id;
		success(`clientId:`, this.idString);
		await this.setDestination();
		await this.setCertificate();
		await this.configCryptography();
		await this.calculatePacketOverhead();
		await this.setupSocket();
		await this.attachEvents();
		Client.connections.set(this.idString, this);
		if (this.autoConnect) {
			console.time('CONNECTING');
			const { realtime } = this;
			this.handshake = await this.connect({
				realtime
			});
			console.timeEnd('CONNECTING');
		}
		return this;
	}
	reKey() {
		const thisClient = this;
		success(`client reKeyed -> ID: ${thisClient.idString}`);
	}
	close(message) {
		console.log(this.idString, `client closed. code ${message.state}`);
		this.socket.close();
		Client.connections.delete(this.idString);
	}
	ask(method, path, parameters, data, head, options) {
		const ask = construct(Ask, [method, path, parameters, data, head, options, this]);
		return ask;
	}
	loadCertificate(certificate) {
		this.destination.certificate = parseCertificate(certificate);
		this.configCryptography();
	}
	proccessCertificateChunk(message) {
		const {
			pid,
			cert,
			last
		} = message;
		this.certificateChunks[pid] = cert;
		if (last) {
			this.loadCertificate(Buffer.concat(this.certificateChunks));
			this.sendHandshake(message);
		}
	}
	async setSessionKeys(generatedKeys) {
		this.sessionKeys = generatedKeys || this.publicKeyCryptography.clientSessionKeys(this.encryptionKeypair, this.destination.encryptionKeypair);
		if (this.sessionKeys) {
			success(`Created Shared Keys`);
			success(`receiveKey: ${toBase64(this.sessionKeys.receiveKey)}`);
			success(`transmitKey: ${toBase64(this.sessionKeys.transmitKey)}`);
		}
	}
	async setNewDestinationKeys() {
		if (!(this.handshakeSet)) {
			this.destination.encryptionKeypair = {
				publicKey: this.newKeypair
			};
			await this.setSessionKeys();
			this.handshakeSet = true;
		}
	}
	async intro(message) {
		console.log('Got server Intro', message);
		const {
			scid: serverConnectionId,
			reKey,
			certSize,
		} = message;
		this.destinationIntroReceived = true;
		this.destination.id = serverConnectionId;
		this.newKeypair = reKey;
		await this.setNewDestinationKeys();
		if (hasValue(certSize)) {
			this.certSize = certSize;
		} else {
			this.sendHandshake(message);
		}
	}
	async sendHandshake(originalMessage) {
		const message = {
			handshake: true
		};
		this.send(message);
	}
	handshaked(message) {
		console.log('Handshake Completed with new keys');
		this.connected = true;
		this.state = 2;
		this.readyState = 1;
		// Resolve the handshake promise
		this.handshakeCompleted(message);
	}
	setPublicKeyHeader(header = {}) {
		const key = this.encryptionKeypair.publicKey;
		console.log('Setting Public Key in UDSP Header', toBase64(key));
		const { encryptClientKey } = this.certificate;
		header.key = key;
		if (this.destination.encryptionKeypair) {
			if (encryptClientKey) {
				console.log('Encrypting Public Key in UDSP Header');
				header.key = this.boxCryptography.boxSeal(header.key, this.destination.encryptionKeypair);
			}
		}
		return header;
	}
	sendIntro() {
		console.log('Sending Intro');
		this.state = 1;
		const header = this.setPublicKeyHeader();
		const requestCertificate = Boolean(this.hasCertificate);
		const message = {
			intro: true,
			random: this.randomId
		};
		this.introSent = true;
		this.send(message, header);
	}
	ensureHandshake() {
		if (this.connected === true) {
			return true;
		} else if (!this.handshakeCompleted) {
			this.awaitHandshake = promise((accept) => {
				this.handshakeCompleted = accept;
			});
			this.sendIntro();
		}
		return this.awaitHandshake;
	}
	async send(message, headers, footer) {
		console.log(`client.send to Server`, this.destination.port, this.destination.ip);
		return sendPacket(message, this, this.socket, this.destination, headers, footer);
	}
	proccessProtocolPacket(message) {
		const {
			intro,
			certIndex,
			handshake,
			state
		} = message;
		console.log('Processing Protocol Packet', message);
		if (intro) {
			if (certIndex) {
				this.proccessCertificateChunk(message);
			} else {
				this.intro(message);
			}
		} else if (handshake) {
			this.handshaked(message);
		} else if (state) {
			if (state === 3) {
				this.close(message);
			}
		}
	}
	request = request;
	fetch = fetchRequest;
	post = post;
	processMessage = processMessage;
	emit = emit;
	onListening = onListening;
	onPacket = onPacket;
	destination = {};
	autoConnect = false;
	static connections = new Map();
	certificateChunks = [];
	requestQueue = construct(Map);
	data = construct(Map);
}
export async function client(configuration) {
	console.log('Create Client');
	const uwClient = await construct(Client, [configuration]);
	return uwClient;
}
// Add the request export here for simple auto connect and then just grab contents to return called UDSP
// client is for a longer stateful connection request to a remote server
// udsp is for a single request to a remote server then closes after response
export { getCertificate };
