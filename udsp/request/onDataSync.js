export async function callOnDataSyncEvent(message) {
	console.log('callOnDataSyncEvent', message.packetId);
	this.events.dataSync(message.data, message.packetId);
}
export async function onDataSync(message) {
	const source = this;
	if (source.events.dataSync) {
		const { packetId } = message;
		const { incomingDataPackets } = this;
		if (packetId === this.onDataCurrentId) {
			await source.callOnDataSyncEvent(message);
			const nextId = this.onDataCurrentId++;
			let currentMessage = source.incomingDataPackets[this.onDataCurrentId];
			while (currentMessage) {
				await source.callOnDataSyncEvent(currentMessage);
				this.onDataCurrentId++;
				currentMessage = source.incomingDataPackets[this.onDataCurrentId];
			}
		}
	}
}
