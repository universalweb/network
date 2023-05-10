import {
	isEmpty, promise, eachArray, assign, construct, stringify, hasValue, get
} from 'Acid';
import { processPacketEvent } from './server/processPacketEvent.js';
import { decode, encode } from 'msgpackr';
import {
	success, failed, info, msgReceived, msgSent
} from '#logs';
const chunkSize = 700;
const transferEncodingTypesChunked = /stream|file|image|string/;
export class Reply {
	constructor(packet, client) {
		const thisReply = this;
		const {
			replyQueue,
			packetIdGenerator
		} = client;
		const timeStamp = Date.now();
		thisReply.created = timeStamp;
		thisReply.client = function() {
			return client;
		};
		const server = client.server();
		thisReply.server = function() {
			return server;
		};
		const { sid } = packet;
		thisReply.sid = sid;
		thisReply.response.sid = sid;
		replyQueue.set(sid, thisReply);
		thisReply.received(packet);
		return thisReply;
	}
	// Incoming
	request = {};
	response = {};
	incomingPackets = [];
	incomingChunks = [];
	totalIncomingPackets = 0;
	totalIncomingPayloadSize = 0;
	// Must be checked for uniqueness
	totalReceivedPackets = 0;
	// Outgoing
	outgoingPayload = {};
	outgoingPackets = [];
	outgoingAcks = [];
	outgoingNacks = [];
	outgoingChunks = [];
	totalOutgoingPackets = 0;
	totalOutgoingPayloadSize = 0;
	/*
		0 Created
		1 Receiving
		2 Received
		3 Sending
		4 Sent
		5 Acknowledged
		6 Completed
	*/
	state = 0;
	// Flush Ask Body to Free Memory
	flushIn() {
		this.incomingPayload = {};
		this.incomingPackets = [];
		this.incomingChunks = [];
		this.totalIncomingPackets = 0;
		this.totalIncomingPayloadSize = 0;
	}
	// Flush Reply Body to Free Memory
	flushOut() {
		this.outgoingPayload = {};
		this.outgoingPackets = [];
		this.outgoingChunks = [];
		this.totalOutgoingPackets = 0;
		this.totalOutgoingPayloadSize = 0;
	}
	// Flush all body
	flush() {
		this.flushOut();
		this.flushAsk();
	}
	// Flush All body and remove this reply from the map
	destroy() {
		this.flush();
		this.server().replyQueue.delete(this.sid);
	}
	// Raw Send Packet
	sendPacket(request, serverArg, client) {
		if (serverArg) {
			return serverArg.send(client, request);
		}
		const server = this.server();
		server.send(server.client(), request);
	}
	chunk(body) {
		const chunks = [];
		const packetLength = body.length;
		for (let index = 0; index < packetLength;index += chunkSize) {
			const chunk = body.slice(index, index + chunkSize);
			chunks.push(chunk);
		}
		return chunks;
	}
	sendChunked(packet, transferEncoding) {
		const thisReply = this;
		if (packet.body && packet.body.length > 700) {
			const chunks = thisReply.chunk(packet.body);
			const packetLength = chunks.length;
			thisReply.totalOutgoingPackets = packetLength;
			eachArray(chunks, (item, id) => {
				const outgoingPacket = assign({}, packet);
				if (id === 0) {
					outgoingPacket.te = transferEncoding;
					outgoingPacket.pt = packetLength;
				}
				outgoingPacket.pid = id;
				outgoingPacket.body = item;
				thisReply.outgoingPackets[id] = outgoingPacket;
			});
		} else {
			packet.en = transferEncoding;
			packet.pt = 0;
			thisReply.outgoingPackets[0] = packet;
		}
	}
	// transferEncoding types: json, stream, file,
	send(transferEncoding) {
		const response = this.response;
		const thisReply = this;
		msgSent('REPLY.SEND', response);
		if (response.body) {
			if (transferEncodingTypesChunked.test(transferEncoding)) {
				this.sendChunked(response, transferEncoding);
			} else if (transferEncoding === 'struct' || transferEncoding === 'json') {
				response.body = encode(response.body);
				this.sendChunked(response, transferEncoding);
			}
		}
		thisReply.replyAll();
	}
	replyIDs(packetIDs) {
		const thisReply = this;
		const server = this.server();
		const client = this.client();
		eachArray(packetIDs, (id) => {
			server.send(client, thisReply.outgoingPackets[id]);
		});
	}
	replyAll() {
		const thisReply = this;
		const server = this.server();
		const client = this.client();
		console.log('Reply.replyAll', thisReply.outgoingPackets);
		eachArray(thisReply.outgoingPackets, (packet) => {
			server.send(client, packet);
		});
	}
	received(packet) {
		const thisReply = this;
		const {
			body,
			head,
			sid,
			pid,
			act,
			pt,
			te,
			cmplt,
			finale,
			ack,
			nack
		} = packet;
		if (cmplt) {
			return thisReply.destroy();
		}
		if (pt) {
			thisReply.totalIncomingPackets = pt;
		}
		if (te) {
			thisReply.transferEncoding = te;
		}
		if (pid) {
			if (!thisReply.incomingPackets[pid]) {
				thisReply.incomingPackets[pid] = packet;
				thisReply.totalReceivedPackets++;
			}
		} else {
			thisReply.incomingPackets[0] = packet;
			thisReply.totalReceivedPackets = 1;
			thisReply.totalIncomingPackets = 1;
		}
		if (thisReply.totalIncomingPackets === thisReply.totalReceivedPackets) {
			thisReply.state = 2;
		}
		if (thisReply.state === 2) {
			thisReply.assemble();
		}
	}
	assemble() {
		const thisReply = this;
		const { transferEncoding } = thisReply;
		if (thisReply.totalIncomingPackets === 1) {
			thisReply.request = thisReply.incomingPackets[0];
			return thisReply.process();
		}
		const packet = thisReply.incomingPackets[0];
		eachArray(thisReply.incomingPackets, (item) => {
			if (item.body) {
				Buffer.concat(packet.body, item.body);
			}
		});
		if (transferEncoding === 'struct' || !transferEncoding) {
			msgReceived(thisReply.request);
			if (thisReply.request.body) {
				thisReply.request.body = decode(thisReply.request.body);
			}
		}
		thisReply.flushOut();
	}
	async process() {
		const thisReply = this;
		const request = thisReply.request;
		const {
			body,
			sid,
			evnt,
			act
		} = request;
		const {
			events,
			actions
		} = thisReply.server();
		const eventName = act || evnt;
		const method = (act) ? actions.get(act) : events.get(evnt);
		if (method) {
			info(`Request:${eventName} RequestID: ${sid}`);
			console.log(request);
			const hasResponse = await method(request, thisReply);
			return;
		} else {
			return failed(`Invalid method name given. ${stringify(request)}`);
		}
	}
}
export function reply(request, client) {
	const { replyQueue } = client;
	const { sid } = request;
	msgReceived(`Stream ID: ${sid}`);
	if (replyQueue.has(sid)) {
		msgReceived(`REPLY FOUND: ${sid}`);
		return replyQueue.get(sid);
	}
	msgReceived(`CREATE REPLY: ${sid}`, request);
	return construct(Reply, [request, client]);
}
