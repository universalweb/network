import * as defaultCrypto from '#crypto';
import {
	RistrettoPoint,
	ed25519,
	ed25519ctx,
	ed25519ph,
	x25519
} from '@noble/curves/ed25519';
import { assign, hasValue } from '@universalweb/acid';
import {
	cshake128,
	cshake256,
	k12,
	keccakprg,
	kmac128,
	kmac256,
	m14,
	parallelhash256,
	tuplehash256
} from '@noble/hashes/sha3-addons';
import { ed448, ed448ph, x448 } from '@noble/curves/ed448';
import {
	keccak_224,
	keccak_256,
	keccak_384,
	keccak_512,
	sha3_224,
	sha3_256,
	sha3_384,
	sha3_512,
	shake128,
	shake256
} from '@noble/hashes/sha3';
import { pallas, vesta } from '@noble/curves/pasta';
import { pbkdf2, pbkdf2Async } from '@noble/hashes/pbkdf2';
import { schnorr, secp256k1 } from '@noble/curves/secp256k1';
import { scrypt, scryptAsync } from '@noble/hashes/scrypt';
import { sha384, sha512, sha512_256 } from '@noble/hashes/sha512';
import { blake2b } from '@noble/hashes/blake2b';
import { blake2s } from '@noble/hashes/blake2s';
import { blake3 } from '@noble/hashes/blake3';
import { bls12_381 } from '@noble/curves/bls12-381';
import { bn254 } from '@noble/curves/bn254';
import { currentVersion } from '../defaults.js';
import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { jubjub } from '@noble/curves/jubjub';
import { p256 } from '@noble/curves/p256';
import { p384 } from '@noble/curves/p384';
import { p521 } from '@noble/curves/p521';
import { ripemd160 } from '@noble/hashes/ripemd160';
const { seal } = Object;
const {
	encrypt, decrypt, nonceBox, sign, signVerify, createSecretKey,
	signKeypair, encryptKeypair, createSessionKey, clientSessionKeys,
	serverSessionKeys, signPrivateKeyToEncryptPrivateKey, signPublicKeyToEncryptPublicKey,
	signKeypairToEncryptionKeypair, getSignPublicKeyFromPrivateKey, keypair,
	boxUnseal, boxSeal, randomConnectionId, hashMin: defaultHashMin, hash: defaultHash,
} = defaultCrypto;
const ed25119_x25519_xchacha20_poly1305 = {
	name: 'ed25119_x25519_xchacha20_poly1305',
	alias: 'default',
	id: 0,
	nonceBox,
	encryptKeypair,
	createSessionKey,
	keypair,
	decrypt,
	encrypt,
	signKeypair,
	sign,
	signVerify,
	signPrivateKeyToEncryptPrivateKey,
	signPublicKeyToEncryptPublicKey,
	signKeypairToEncryptionKeypair,
	getSignPublicKeyFromPrivateKey,
	safeMath: RistrettoPoint,
	clientSessionKeys,
	serverSessionKeys,
};
const ed25519Algo = {
	name: 'ed25519',
	alias: 'default',
	id: 0,
	signKeypair,
	sign,
	signVerify,
	signPrivateKeyToEncryptPrivateKey,
	signPublicKeyToEncryptPublicKey,
	signKeypairToEncryptionKeypair,
	getSignPublicKeyFromPrivateKey,
	safeMath: RistrettoPoint,
	clientSessionKeys,
	serverSessionKeys,
};
const xsalsa20Algo = {
	boxSeal,
	boxUnseal
};
export const publicKeyAlgorithms = new Map();
const publicKeyAlgorithmVersion1 = new Map();
publicKeyAlgorithms.set('1', publicKeyAlgorithmVersion1);
publicKeyAlgorithmVersion1.set('ed25519', ed25519Algo);
publicKeyAlgorithmVersion1.set(0, ed25519Algo);
publicKeyAlgorithmVersion1.set('default', ed25519Algo);
publicKeyAlgorithmVersion1.set('available', ['ed25119_x25519_xchacha20_poly1305']);
export const cipherSuites = new Map();
const cipherSuitesVersion1 = new Map();
cipherSuites.set('1', cipherSuitesVersion1);
cipherSuitesVersion1.set('ed25119_x25519_xchacha20_poly1305', ed25119_x25519_xchacha20_poly1305);
cipherSuitesVersion1.set(0, ed25119_x25519_xchacha20_poly1305);
cipherSuitesVersion1.set('default', ed25119_x25519_xchacha20_poly1305);
cipherSuitesVersion1.set('available', ['ed25119_x25519_xchacha20_poly1305']);
export const boxAlgorithms = new Map();
const boxAlgorithmsVersion1 = new Map();
boxAlgorithms.set('1', boxAlgorithmsVersion1);
boxAlgorithmsVersion1.set('xsalsa20', xsalsa20Algo);
boxAlgorithmsVersion1.set(0, xsalsa20Algo);
boxAlgorithmsVersion1.set('default', xsalsa20Algo);
boxAlgorithmsVersion1.set('available', ['xsalsa20Algo']);
export const algorithms = {};
assign(algorithms, publicKeyAlgorithms);
assign(algorithms, boxAlgorithms);
assign(algorithms, cipherSuites);
export function getCipherSuite(cipherSuiteName, version = currentVersion) {
	if (!hasValue(cipherSuiteName)) {
		return false;
	}
	const cipherVersion = cipherSuites.get(version);
	if (cipherVersion) {
		return cipherVersion.get(cipherSuiteName);
	}
}
export function getPublicKeyAlgorithm(publicKeyAlgorithmName, version = currentVersion) {
	if (!hasValue(publicKeyAlgorithmName)) {
		return false;
	}
	const algoVersion = cipherSuites.get(version);
	if (algoVersion) {
		return algoVersion.get(publicKeyAlgorithmName);
	}
}
export function processPublicKey(certificate) {
	console.log('keypairType', certificate);
	const {
		publicKeyAlgorithm,
		encryptionKeypair,
		privateKey,
		publicKey
	} = certificate;
	if (!encryptionKeypair && publicKeyAlgorithm === 'ed25519') {
		if (publicKeyAlgorithm === 'ed25519') {
			const publicKeyCryptography = getPublicKeyAlgorithm(publicKeyAlgorithm);
			if (privateKey) {
				return publicKeyCryptography.signKeypairToEncryptionKeypair({
					publicKey,
					privateKey
				});
			} else {
				return publicKeyCryptography.signKeypairToEncryptionKeypair({
					publicKey
				});
			}
		}
	}
}
