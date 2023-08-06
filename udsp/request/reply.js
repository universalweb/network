import {
	isEmpty, isBuffer, promise, eachArray, assign, construct, stringify, hasValue, get, objectSize
} from '@universalweb/acid';
import { decode, encode } from 'msgpackr';
import {
	success, failed, info, msgReceived, msgSent
} from '#logs';
import { processEvent } from '#udsp/processEvent';
import { Base } from './base.js';
/**
	* @todo
*/
export class Reply extends Base {
	constructor(request, source) {
		super(request, source);
		console.log('Setting up new reply');
		const thisReply = this;
		const { message } = request;
		const { sid } = message;
		// console.log(source);
		// // console.log(message);
		const { replyQueue, } = source;
		this.sid = sid;
		this.id = sid;
		this.response.sid = sid;
		replyQueue.set(sid, this);
	}
	type = 'reply';
	isReply = true;
	async complete() {
		this.state = 1;
		await processEvent(this);
	}
	response = {};
}
export function reply(packet, client) {
	// console.log(client);
	return construct(Reply, [packet, client]);
}
