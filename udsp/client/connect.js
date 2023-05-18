import { connected } from '#logs';
import { decode } from 'msgpackr';
export async function connect(payload = {}) {
	console.log('-------CLIENT CONNECTING-------\n');
	const thisClient = this;
	// opn stands for open meaning connect to a server
	payload.act = 'opn';
	payload.body = {
		intro: 'Hello World!'
	};
	const result = await thisClient.request(payload);
	console.log(result);
	const {
		body,
		state,
		time,
		cid
	} = result.response;
	if (state === 1 && cid) {
		connected(body);
		thisClient.state = 1;
		thisClient.cid = cid;
		thisClient.id = cid;
		thisClient.lastPacketTime = Date.now();
		thisClient.lastPacketGivenTime = time;
		const bodyDecoded = decode(body);
		console.log(bodyDecoded);
		if (bodyDecoded.reKey) {
			// thisClient.reKey(bodyDecoded.reKey);
		}
	}
	console.log('-------CLIENT CONNECTED-------\n');
	return result;
}
// const [headers] = packet;
// if (headers?.key) {
// 	msgReceived(`New PublicKey received ${headers.key.length}`);
// 	this.destination.publicKey = headers.key;
// 	reKey(this.transmitKey, this.receiveKey, keypair.publicKey, keypair.privateKey, headers.key);
// }
