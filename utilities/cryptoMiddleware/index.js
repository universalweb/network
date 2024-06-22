/* TODO: Add Mobile/Embedded Preferred option & algorithms. */
import * as defaultCrypto from '#crypto';
import {
	assign,
	clearBuffer,
	compactMapArray,
	eachArray,
	hasValue,
	isArray,
	isNumber,
	isUndefined
} from '@universalweb/acid';
import { currentCertificateVersion, currentVersion } from '../../defaults.js';
import { blake3Hash } from './blake3.js';
import { ed25519Algo } from './ed25519.js';
import { x25519_kyber768_xchacha20 } from './kyber.js';
import { x25519_xchacha20 } from './x25519XChaCha.js';
function setOption(source, option) {
	source.set(option.name, option);
	source.set(option.id, option);
	source.set(option.alias, option);
}
export const cipherSuites = new Map();
const cipherSuitesVersion1 = new Map();
cipherSuites.set(1, cipherSuitesVersion1);
cipherSuitesVersion1.set('all', [x25519_xchacha20]);
setOption(cipherSuitesVersion1, x25519_xchacha20);
export const cipherSuitesCertificates = new Map();
const cipherSuitesCertificatesVersion1 = new Map();
cipherSuitesCertificates.set(1, cipherSuitesCertificatesVersion1);
cipherSuitesCertificatesVersion1.set('all', [x25519_xchacha20, x25519_kyber768_xchacha20]);
setOption(cipherSuitesCertificatesVersion1, x25519_xchacha20);
setOption(cipherSuitesCertificatesVersion1, x25519_kyber768_xchacha20);
export function getEncryptionKeypairAlgorithm(algo = 0, version = currentCertificateVersion) {
	if (!hasValue(algo)) {
		return false;
	}
	const cipherVersion = cipherSuitesCertificates.get(version);
	if (cipherVersion) {
		return cipherVersion.get(algo);
	}
}
export function getCipherSuite(cipherSuiteName = 0, version = currentVersion) {
	if (!hasValue(cipherSuiteName)) {
		return false;
	}
	const cipherVersion = cipherSuites.get(version);
	if (cipherVersion) {
		return cipherVersion.get(cipherSuiteName);
	}
}
export function getCipherSuites(indexes, version = currentVersion) {
	if (indexes) {
		if (isNumber(indexes)) {
			return getCipherSuite(indexes, version);
		} else if (isArray(indexes)) {
			const cipherSuitesArray = compactMapArray(indexes, (value) => {
				const cipherSuite = getCipherSuite(value, version);
				if (cipherSuite) {
					cipherSuitesArray.push(cipherSuite);
				}
			});
			return cipherSuitesArray;
		}
	}
	return getCipherSuite('all', version);
}
export const publicKeyAlgorithms = new Map();
const publicKeyAlgorithmVersion1 = new Map();
publicKeyAlgorithms.set(1, publicKeyAlgorithmVersion1);
setOption(publicKeyAlgorithmVersion1, ed25519Algo);
export const publicKeyCertificateAlgorithms = new Map();
const publicKeyCertificateAlgorithmsVersion1 = new Map();
publicKeyCertificateAlgorithms.set(1, publicKeyCertificateAlgorithmsVersion1);
setOption(publicKeyCertificateAlgorithmsVersion1, ed25519Algo);
// export const boxAlgorithms = new Map();
// const boxAlgorithmsVersion1 = new Map();
// boxAlgorithms.set(1, boxAlgorithmsVersion1);
// setOption(boxAlgorithmsVersion1, xsalsa20Algo);
export const hashAlgorithms = new Map();
const hashAlgorithmsVersion1 = new Map();
hashAlgorithms.set(1, hashAlgorithmsVersion1);
setOption(hashAlgorithmsVersion1, blake3Hash);
export function getSignatureAlgorithm(publicKeyAlgorithmName = 0, version = currentVersion) {
	if (!hasValue(publicKeyAlgorithmName)) {
		return false;
	}
	const algoVersion = publicKeyAlgorithms.get(version);
	if (algoVersion) {
		return algoVersion.get(publicKeyAlgorithmName);
	}
}
export function getSignatureAlgorithmByCertificate(publicKeyAlgorithmName = 0, version = currentCertificateVersion) {
	if (!hasValue(publicKeyAlgorithmName)) {
		return false;
	}
	const algoVersion = publicKeyCertificateAlgorithms.get(version);
	if (algoVersion) {
		return algoVersion.get(publicKeyAlgorithmName);
	}
}
export function getHashAlgorithm(hashAlgorithmName = 0, version = currentVersion) {
	if (!hasValue(hashAlgorithmName)) {
		return false;
	}
	const algoVersion = hashAlgorithms.get(version);
	if (algoVersion) {
		return algoVersion.get(hashAlgorithmName);
	}
}
