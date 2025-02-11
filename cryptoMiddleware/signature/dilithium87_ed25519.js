import {
	getDilithiumPrivateKey,
	getDilithiumPublicKey,
	getDilithiumSignature,
	getEd25519PrivateKey,
	getEd25519PublicKey,
	getEd5519Signature
} from './dilithium_ed25519.js';
import { dilithium87 } from './dilithium87.js';
import { ed25519 } from './ed25519.js';
const generateKeypair = dilithium87;
export async function sign(message, privateKeyArg) {
	const privateKey = privateKeyArg?.privateKey || privateKeyArg;
	const ed25519PrivateKey = getEd25519PrivateKey(privateKey);
	const dilithiumPrivateKey = getDilithiumPrivateKey(privateKey);
	const ed25519Signature = await ed25519.sign(message, ed25519PrivateKey);
	// console.log(ed25519Signature.length);
	const dilithiumSignature = await generateKeypair.sign(message, dilithiumPrivateKey);
	// console.log(dilithiumSignature.length);
	const signature = Buffer.concat([ed25519Signature, dilithiumSignature]);
	return signature;
}
export async function signCombined(message, privateKey) {
	const signature = await sign(message, privateKey);
	return Buffer.concat([message, signature]);
}
export async function verifySignature(signature, message, publicKey) {
	const ed25519Signature = signature.subarray(0, 64);
	const dilithiumSignature = signature.subarray(64);
	const ed25519PublicKey = getEd25519PublicKey(publicKey);
	const dilithiumPublicKey = getDilithiumPublicKey(publicKey);
	const ed25519Verify = await ed25519.verifySignatureDetached(ed25519Signature, ed25519PublicKey, message);
	const dilithiumVerify = await generateKeypair.verifySignature(dilithiumSignature, dilithiumPublicKey, message);
	// console.log(ed25519Verify, dilithiumVerify);
	return (ed25519Verify === dilithiumVerify) ? ed25519Verify : false;
}
export async function signatureKeypair(target) {
	const ed25519NewKeypair = await ed25519.signatureKeypair();
	const dilithiumNewKeypair =	await generateKeypair.signatureKeypair();
	const publicKey = Buffer.concat([ed25519NewKeypair.publicKey, dilithiumNewKeypair.publicKey]);
	const privateKey = Buffer.concat([ed25519NewKeypair.privateKey, dilithiumNewKeypair.privateKey]);
	if (target) {
		target.publicKey = publicKey;
		target.privateKey = privateKey;
		return target;
	}
	return {
		publicKey,
		privateKey
	};
}
export const dilithium87_ed25519 = {
	name: 'dilithium87_ed25519',
	alias: 'dilithium87_ed25519',
	ed25519,
	rawMethod: dilithium87,
	id: 1,
	verifySignature,
	signatureKeypair,
	sign,
	signCombined,
	getDilithiumPrivateKey,
	getDilithiumPublicKey,
	getEd25519PrivateKey,
	getEd25519PublicKey
};
console.log((await signatureKeypair()).publicKey.length);
