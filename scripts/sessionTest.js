import sodium from 'sodium-native';
import { serverSession, createSessionKey, clientSession } from 'utilities/crypto.js';
const clientPk = Buffer.from('Y2IZeRKiABebTmEIPJ3WIP8L0TXk05PWztXBBseEkVQ=', 'base64');
const clientSk = Buffer.from('RBQi03JCxsE8O5Q6fl8Y6qeXVEyAeesSf9dCawbc2Ms=', 'base64');
const serverPk = Buffer.from('w5J5FYJHMO9QFfzXGea6kgHVg1X8ucGURX8QADBnwyI=', 'base64');
const serverSk = Buffer.from('k9+96mGqDnFNt5VRLR9NJGACcahQ2vHGftmQDV+j83E=', 'base64');
sodium.crypto_kx_keypair(serverPk, serverSk);
sodium.crypto_kx_keypair(clientPk, clientSk);
const keys = serverSession(serverPk, serverSk, clientPk);
console.log(keys.receiveKey.toString('base64'));
console.log(keys.transmitKey.toString('base64'));
console.log('\n\n');
const transmitKey = createSessionKey();
const receiveKey = createSessionKey();
clientSession(receiveKey, transmitKey, clientPk, clientSk, serverPk);
console.log(receiveKey.toString('base64'));
console.log(transmitKey.toString('base64'));
