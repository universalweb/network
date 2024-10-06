import { askRPC, defaultStage, replyRPC } from '../rpc/rpcCodes.js';
import { hasValue } from '@universalweb/acid';
export async function checkSetupSent() {
	const { isAsk } = this;
	console.log(`CHECK SETUP STATUS checkSetupSent - STATE:${this.state}`);
	if (isAsk) {
		if (this.state === askRPC.setup) {
			console.log('STATE STILL 1 NEED TO RESEND SETUP');
			return this.sendSetup();
		}
	} else if (this.state === replyRPC.setup) {
		console.log('STATE STILL 5 NEED TO RESEND SETUP');
		return this.sendSetup();
	}
	this.clearSetupTimeout();
}
export function clearSetupTimeout() {
	clearTimeout(this.setupTimeout);
	this.setupTimeout = null;
}
export async function sendSetup() {
	const source = this;
	const { isAsk } = this;
	console.log('sendSetup', this.state);
	const message = this.getPacketTemplate(0);
	if (isAsk) {
		message.push(this.method, this.outgoingPathSize, this.outgoingParametersSize, this.outgoingHeadSize);
		if (this.state === defaultStage) {
			this.setState(askRPC.setup);
		}
	} else {
		message.push(this.outgoingHeadSize);
		if (this.state === replyRPC.sendDataReady) {
			this.setState(replyRPC.setup);
		}
	}
	if (hasValue(this.outgoingDataSize)) {
		message.push(this.outgoingDataSize);
	}
	this.setupTimeout = setTimeout(() => {
		source.checkSetupSent();
	}, this.latencyTimeout);
	return this.sendPacket(message);
}
