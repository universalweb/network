import { currentCertificateVersion, currentVersion } from '../../defaults.js';
import { dilithium44 } from './dilithium44.js';
import { dilithium44_ed25519 } from './dilithium65_ed25519.js';
import { dilithium65 } from './dilithium65.js';
import { dilithium87 } from './dilithium87.js';
import { ed25519 } from './ed25519.js';
import { ed25519_sodium } from './ed25519_sodium.js';
import { hasValue } from '@universalweb/acid';
import { setOptions } from '../utils.js';
import { sphincs192 } from './sphincs192.js';
const cipherList = [
	ed25519,
	dilithium44_ed25519,
	dilithium44,
	dilithium65,
	dilithium87,
	sphincs192,
	ed25519_sodium
];
export const publicKeyAlgorithms = new Map();
const publicKeyAlgorithmVersion1 = new Map();
publicKeyAlgorithms.set(1, publicKeyAlgorithmVersion1);
publicKeyAlgorithmVersion1.set('all', cipherList);
setOptions(publicKeyAlgorithmVersion1, cipherList);
export function getSignatureAlgorithm(publicKeyAlgorithmName = 0, version = currentVersion) {
	if (!hasValue(publicKeyAlgorithmName)) {
		return false;
	}
	const versionMap = publicKeyAlgorithms.get(version);
	if (versionMap) {
		return versionMap.get(publicKeyAlgorithmName);
	}
}
export const publicKeyCertificateAlgorithms = new Map();
const publicKeyCertificateAlgorithmsVersion1 = new Map();
publicKeyCertificateAlgorithms.set(currentVersion, publicKeyCertificateAlgorithmsVersion1);
publicKeyCertificateAlgorithmsVersion1.set('all', cipherList);
setOptions(publicKeyCertificateAlgorithmsVersion1, cipherList);
export function getSignatureAlgorithmByCertificate(publicKeyAlgorithmName = 0, version = currentCertificateVersion) {
	if (!hasValue(publicKeyAlgorithmName)) {
		return false;
	}
	const algoVersion = publicKeyCertificateAlgorithms.get(version);
	if (algoVersion) {
		return algoVersion.get(publicKeyAlgorithmName);
	}
}
