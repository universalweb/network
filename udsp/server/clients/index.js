import { connected } from './connected.js';
import { initialize } from './initialize.js';
import { created } from './created.js';
import { destroy } from './destroy.js';
import { received } from './received.js';
import {
	success,
	failed,
	imported,
	msgSent,
	info,
	msgReceived
} from '#logs';
import {
	UniqID,
	construct,
	assign,
	promise,
	isFalse,
	isUndefined,
	isFalsy,
	hasValue
} from '@universalweb/acid';
import {
	toBase64,
	randomBuffer
} from '#crypto';
import { encodePacket } from '#udsp/encoding/encodePacket';
import { sendPacket } from '#udsp/sendPacket';
import { reply } from '#udsp/request/reply';
export class Client {
	constructor(config) {
		const { server } = config;
		const client = this;
		this.server = function() {
			return server;
		};
		this.socket = function() {
			return server.socket;
		};
		this.events = server.events;
		this.requestMethods = server.requestMethods;
		this.cipherSuites = server.cipherSuites;
		this.publicKeyCryptography = server.publicKeyCryptography;
		this.encryptClientConnectionId = server.encryptClientConnectionId;
		this.encryptServerConnectionId = server.encryptServerConnectionId;
		return this.initialize(config);
	}
	initialize = initialize;
	async calculatePacketOverhead() {
		const server = this.server();
		const {
			maxPacketSize,
			maxPacketDataSize,
			maxPacketHeadSize,
			maxPacketPathSize,
			maxPacketParametersSize,
			packetMaxPayloadSafeEstimate
		} = server;
		const {
			cipherSuite,
			cipherSuiteName,
		} = this;
		const cachedCipherSuitePacketOverhead = server.cachedPacketSizes[cipherSuiteName];
		if (cachedCipherSuitePacketOverhead) {
			return assign(this, cachedCipherSuitePacketOverhead);
		}
		const encryptOverhead = cipherSuite?.encrypt?.overhead || 0;
		console.log('encryptOverhead', encryptOverhead);
		if (hasValue(encryptOverhead)) {
			this.encryptOverhead = encryptOverhead;
		}
		if (maxPacketSize) {
			this.maxPacketSize = maxPacketSize - encryptOverhead;
		}
		if (maxPacketDataSize) {
			this.maxPacketDataSize = maxPacketDataSize - encryptOverhead;
		}
		if (maxPacketHeadSize) {
			this.maxPacketHeadSize = maxPacketHeadSize - encryptOverhead;
		}
		if (maxPacketPathSize) {
			this.maxPacketPathSize = maxPacketPathSize - encryptOverhead;
		}
		if (maxPacketParametersSize) {
			this.maxPacketHeadSize = maxPacketParametersSize - encryptOverhead;
		}
		if (packetMaxPayloadSafeEstimate) {
			this.packetMaxPayloadSafeEstimate = packetMaxPayloadSafeEstimate - encryptOverhead;
		}
	}
	async created() {
		const server = this.server();
		await created(this, server);
		info(`socket EVENT -> created - ID:${this.idString}`);
	}
	async connected() {
		const server = this.server();
		await connected(this, server);
		success(`socket EVENT -> connected - ID:${this.idString}`);
	}
	async generateSessionKeypair() {
		const newKeypair = this.cipherSuite.keypair();
		this.newKeypair = newKeypair;
		info(`socket EVENT -> reKey - ID:${this.idString}`);
	}
	async setSessionKeys() {
		console.log(this.destination);
		console.log(this);
		const sessionKeys = this.publicKeyCryptography.serverSessionKeys(this.encryptionKeypair, this.destination.encryptionKeypair, this.sessionKeys);
		if (isUndefined(this.sessionKeys)) {
			this.sessionKeys = sessionKeys;
		}
		success(`receiveKey: ${toBase64(this.sessionKeys.receiveKey)}`);
		success(`transmitKey: ${toBase64(this.sessionKeys.transmitKey)}`);
	}
	updateState(state) {
		this.state = state;
	}
	async send(message, headers, footer) {
		msgSent(`socket Sent -> ID: ${this.idString}`);
		return sendPacket(message, this, this.socket(), this.destination, headers, footer);
	}
	async received(message, frameHeaders) {
		const server = this.server();
		await received(this, message, frameHeaders, server);
		info(`socket EVENT -> send - ID:${this.idString}`);
	}
	async authenticate(packet) {
	}
	async destroy(destroyCode) {
		const server = this.server();
		await destroy(this, destroyCode, server);
		info(`socket EVENT -> destroy - ID:${this.idString}`);
	}
	async intro(message) {
		this.sendIntro(message);
	}
	// server intro to client with connection id and new keypair
	async sendIntro(introMessage) {
		info(`Client Intro Sent -> - ID:${this.idString}`, introMessage);
		if (isFalsy(this.newKeypairGenerated)) {
			this.generateSessionKeypair();
			this.newKeypairGenerated = true;
		}
		const message = {
			intro: true,
			scid: this.id,
			reKey: this.newKeypair.publicKey,
			randomId: this.randomId
		};
		this.state = 1;
		await this.send(message);
	}
	// client confirmation of server intro
	async handshake(message) {
		this.sendHandshake();
	}
	async attachNewClientKeys() {
		this.state = 2;
		this.encryptionKeypair = this.newKeypair;
		await this.setSessionKeys();
		this.newSessionKeysAssigned = true;
	}
	// server confirmation of handshake to client
	async sendHandshake(originalMessage) {
		const message = {
			handshake: true
		};
		await this.send(message);
	}
	chunkCertificate(certificate) {
	}
	proccessProtocolPacket(message) {
		info(`Server:Client proccessProtocolPacket -> - ID:${this.idString}`);
		console.log(message);
		const {
			intro,
			certRequest,
			handshake,
			handshakeFinale
		} = message;
		if (intro) {
			this.intro(message);
		} else if (handshake) {
			this.handshake(message);
		}
	}
	description = `Server's client`;
	type = 'serverClient';
	isServerClient = true;
	isServerEnd = true;
	pending = false;
	state = 0;
	encryptConnectionId = false;
	randomId = randomBuffer(8);
	data = construct(Map);
	replyQueue = construct(Map);
	reply(packet) {
		const { message } = packet;
		const id = message.id;
		console.log('Reply Client', id, this.replyQueue.has(id), packet);
		if (hasValue(id)) {
			if (this.replyQueue.has(id)) {
				return this.replyQueue.get(id).onPacket(packet);
			}
		}
		reply(packet, this).onPacket(packet);
	}
}
export async function createClient(config) {
	const client = await construct(Client, [config]);
	success(`Client has been created with sever connection id ${toBase64(client.id)}`);
	return client;
}
