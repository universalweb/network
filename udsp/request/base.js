import { sendPacket } from './sendPacket.js';
import { destroy } from './destory.js';
import { bufferPacketization } from './bufferPacketization.js';
import { sendEnd } from './sendEnd.js';
import { on } from './on.js';
import { flushOutgoing, flushIncoming, flush } from './flush.js';
import { sendPacketsById } from './sendPacketsById.js';
import { sendAll } from './sendAll.js';
import { onPacket } from './onPacket.js';
import { isBuffer, isPlainObject, isString } from '@universalweb/acid';
import { encode } from 'msgpackr';
import { request } from '#udsp/request';
export class Base {
	constructor(config, source) {
		const { events } = config;
		const timeStamp = Date.now();
		this.created = timeStamp;
		this.source = function() {
			return source;
		};
		const {
			queue,
			packetIdGenerator,
			maxPacketSize
		} = source;
		if (events) {
			this.on(events);
		}
		if (maxPacketSize) {
			this.maxPacketSize = maxPacketSize;
		}
	}
	code(codeNumber) {
		if (this.isAsk) {
			this.request.head.code = codeNumber;
		} else {
			this.response.head.code = codeNumber;
		}
	}
	setHeader(headerName, headerValue) {
		if (this.isAsk) {
			if (!this.request.head) {
				this.request.head = {};
			}
			this.request.head[headerName] = headerValue;
		}
	}
	writeHeader(headerName, headerValue) {
		if (this.isReply) {
			if (!this.response.head) {
				this.response.head = {};
			}
			this.response.head[headerName] = headerValue;
		}
	}
	dataToBuffer(data) {
		if (isBuffer(data)) {
			return data;
		}
		if (isPlainObject(data)) {
			this.contentType = 1;
			return encode(data);
		}
		return Buffer.from(data);
	}
	destroy = destroy;
	sendEnd = sendEnd;
	sendPacketsById = sendPacketsById;
	sendAll = sendAll;
	onPacket = onPacket;
	sendPacket = sendPacket;
	bufferPacketization = bufferPacketization;
	on = on;
	currentPayloadSize = 0;
	totalReceivedUniquePackets = 0;
	totalIncomingUniquePackets = 0;
	progress = 0;
	request = {
		head: {},
		body: {}
	};
	response = {
		head: {},
		body: {}
	};
	// this is the data in order may have missing packets at times but will remain in order
	data = [];
	// This is as the data came in over the wire out of order
	stream = [];
	events = {};
	header = {};
	options = {};
	outgoingPackets = [];
	incomingPackets = [];
	incomingAks = [];
	incomingNacks = [];
	outgoingAcks = [];
	outgoingNacks = [];
	totalOutgoingPackets = 0;
	totalOutgoingPayloadSize = 0;
	// Must be checked for uniqueness
	totalSentConfirmedPackets = 0;
	totalIncomingPayloadSize = 0;
	// Must be checked for uniqueness
	totalReceivedPackets = 0;
	/* `state = 0;` is initializing the `state` property of the `Ask` class to `0`. This property is used
	to keep track of the state of the request, where `0` represents an unsent request, `1` represents a
	request that is currently being sent, and `2` represents a completed request. */
	state = 0;
	packetTemplate = {};
}
