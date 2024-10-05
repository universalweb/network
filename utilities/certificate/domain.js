import {
	assign,
	clone,
	cloneArray,
	currentPath,
	hasValue,
	isArray,
	isBuffer,
	isPlainObject,
	isString,
	merge,
	promise
} from '@universalweb/acid';
import {
	certificateTypes,
	currentCertificateVersion,
	currentProtocolVersion,
} from '../../defaults.js';
import { decode, encode } from '#utilities/serialize';
import { getCipherSuite, getSignatureAlgorithm } from '../cryptoMiddleware/index.js';
import { read, readStructured, write } from '#file';
import { UWCertificate } from './UWCertificate.js';
import { blake3 } from '@noble/hashes/blake3';
import { keychainSave } from './keychain.js';
import { toBase64 } from '#crypto';
const domainCertificateType = certificateTypes.get('domain');
export async function createDomainCertificateObject(config = {}, options = {}) {
	const currentDate = new Date();
	const {
		certificateType = domainCertificateType,
		entity,
		records,
		version = currentCertificateVersion,
		signatureAlgorithm,
		signatureKeypair,
		contact,
		cipherSuites,
		encryptionKeypair,
		ownerHash,
		protocolOptions,
		start = currentDate.getTime(),
		end = currentDate.setUTCMonth(currentDate.getUTCMonth() + 3),
		encryptionKeypairAlgorithm
	} = config;
	const certificate = {
		version,
		signatureKeypair,
		encryptionKeypair,
		start,
		end,
		certificateType
	};
	if (ownerHash) {
		certificate.ownerHash = ownerHash;
	}
	if (hasValue(protocolOptions)) {
		certificate.protocolOptions = protocolOptions;
	}
	if (certificate.start > certificate.end) {
		certificate.end = currentDate.setUTCMonth(currentDate.getUTCMonth() + 3);
	}
	if (entity) {
		certificate.entity = entity;
	}
	if (records) {
		certificate.records = records;
	}
	if (contact) {
		certificate.contact = contact;
	}
	const protocolVersion = hasValue(protocolOptions?.version) ? protocolOptions.version : currentProtocolVersion;
	if (hasValue(signatureAlgorithm) && signatureAlgorithm !== 0) {
		certificate.signatureAlgorithm = signatureAlgorithm;
	}
	if (hasValue(cipherSuites) && cipherSuites !== 0) {
		certificate.cipherSuites = cipherSuites;
	}
	const signatureMethod = getSignatureAlgorithm(certificate.signatureAlgorithm, protocolVersion);
	if (!signatureKeypair) {
		certificate.signatureKeypair = await signatureMethod.signatureKeypair();
	}
	const chosenEncryptionKeypairAlgorithm = encryptionKeypairAlgorithm || (isArray(cipherSuites) ? cipherSuites[0] : cipherSuites);
	const keyExchangeMethod = getCipherSuite(encryptionKeypairAlgorithm, protocolVersion);
	// console.log('cipherSuites', cipherSuites, encryptionKeypairAlgorithm, keyExchangeMethod);
	if (!encryptionKeypair) {
		certificate.encryptionKeypair = await keyExchangeMethod.certificateEncryptionKeypair();
	}
	// console.log('certificate', certificate);
	return certificate;
}
export function objectToRawDomainCertificate(certificateObject) {
	const {
		entity,
		cipherSuites,
		signatureKeypair,
		signatureAlgorithm,
		records,
		end,
		start,
		protocolOptions,
		options,
		encryptionKeypair,
		contact,
		ownerHash = false,
		certificateType
	} = certificateObject;
	const certificate = [];
	certificate[0] = certificateType;
	certificate[1] = currentCertificateVersion;
	certificate[2] = start;
	certificate[3] = end;
	certificate[4] = ownerHash;
	certificate[5] = [[signatureKeypair.publicKey, signatureKeypair.privateKey], [encryptionKeypair.publicKey, encryptionKeypair.privateKey],];
	if (hasValue(cipherSuites)) {
		certificate[5][2] = cipherSuites;
	}
	if (hasValue(signatureAlgorithm)) {
		certificate[5][3] = signatureAlgorithm;
	}
	if (entity) {
		certificate[6] = entity;
	}
	if (records) {
		certificate[7] = records;
	}
	if (protocolOptions) {
		certificate[8] = [protocolOptions?.version || currentProtocolVersion, protocolOptions.realtime];
	}
	if (options) {
		certificate[9] = options;
	}
	if (contact) {
		certificate[10] = contact;
	}
	return certificate;
}
export function getPublicDomainCertificate(certificate) {
	const publicCertificate = clone(certificate);
	publicCertificate[5][0] = publicCertificate[5][0][0];
	publicCertificate[5][1] = publicCertificate[5][1][0];
	// console.log(publicCertificate);
	return publicCertificate;
}
export function rawToObjectDomainCertificate(rawObject, signature) {
	const rawObjectLength = rawObject.length;
	const [
		certificateType,
		version,
		start,
		end,
		ownerHash,
		[
			signatureKeypair,
			encryptionKeypair,
			cipherSuites,
			signatureAlgorithm,
		],
		entity,
		records,
		protocolOptions,
		options,
		contact,
	] = rawObject;
	const certificate = {
		certificateType,
		version,
		start,
		end,
		ownerHash,
		entity,
	};
	if (isArray(signatureKeypair)) {
		certificate.signatureKeypair = {
			publicKey: signatureKeypair[0],
			privateKey: signatureKeypair[1],
		};
	} else {
		certificate.signatureKeypair = signatureKeypair;
	}
	if (isArray(encryptionKeypair)) {
		certificate.encryptionKeypair = {
			publicKey: encryptionKeypair[0],
			privateKey: encryptionKeypair[1],
		};
	} else {
		certificate.encryptionKeypair = encryptionKeypair;
	}
	if (signature) {
		certificate.signature = signature;
	}
	if (signatureAlgorithm) {
		certificate.signatureAlgorithm = signatureAlgorithm;
	}
	if (cipherSuites) {
		certificate.cipherSuites = cipherSuites;
	}
	if (signature) {
		certificate.signature = signature;
	}
	if (protocolOptions) {
		const [
			protocolVersion,
			realtime
		] = protocolOptions;
		certificate.protocolOptions = {};
		if (hasValue(protocolVersion)) {
			certificate.protocolOptions.protocolVersion = protocolVersion;
		} else {
			certificate.protocolOptions.protocolVersion = currentProtocolVersion;
		}
		if (hasValue(realtime)) {
			certificate.protocolOptions.realtime = realtime;
		}
	}
	if (records) {
		certificate.records = records;
	}
	if (contact) {
		certificate.contact = contact;
	}
	// console.log(certificate);
	return certificate;
}
export class DomainCertificate extends UWCertificate {
	async initialize(config) {
		if (isPlainObject(config)) {
			this.object = await createDomainCertificateObject(config);
			this.update();
		} else if (isString(config)) {
			const source = await readStructured(config);
			this.processAsObject(source);
		} else if (isArray(config)) {
			this.array = config;
			this.object = rawToObjectDomainCertificate(config);
		} else if (isBuffer(config)) {
			const source = decode(config);
			this.processAsObject(source);
		}
		return this;
	}
	processAsObject(source) {
		if (isPlainObject(source)) {
			this.object = source;
		} else if (isArray(source[0])) {
			this.array = source[0];
			this.object = rawToObjectDomainCertificate(this.array, source[1]);
		} else {
			this.array = source;
			this.object = rawToObjectDomainCertificate(source);
		}
	}
	update(config) {
		this.array = objectToRawDomainCertificate(this.object);
	}
	generatePublic() {
		this.publicCertificate = getPublicDomainCertificate(this.array);
		// console.log(this.publicCertificate);
	}
	getSignature() {
		if (!this.publicCertificate) {
			this.generatePublic();
		}
		const signature = this.createSignature();
		return signature;
	}
}
export async function domainCertificate(...args) {
	return new DomainCertificate(...args);
}
export class PublicDomainCertificate extends UWCertificate {
	async initialize(config) {
		const source = isString(config) ? await readStructured(config) : config;
		this.array = source[0];
		this.object = rawToObjectDomainCertificate(source[0], source[1]);
		this.getCipherSuiteMethods();
		return this;
	}
}
export async function publicDomainCertificate(...args) {
	return new PublicDomainCertificate(...args);
}
// const thisPath = currentPath(import.meta);
// const exampleCert = await new DomainCertificate({
// 	entity: 'universalweb.io',
// 	records: [
// 		[
// 			'a',
// 			'@',
// 			'127.0.0.1',
// 			8888
// 		],
// 		[
// 			'aaaa',
// 			'@',
// 			'::1',
// 			8888
// 		],
// 	],
// });
// const pubCert = exampleCert.getPublic();
// console.log(profileCert, profileCert.get('signature').length);
// await exampleCert.savePublic('domainPublicCert', `${thisPath}/cache/`);
// await exampleCert.save('domain', `${thisPath}/cache/`);
// console.log(exampleCert);
// console.log(await new PublicDomainCertificate(`${thisPath}/cache/domainPublicCert.cert`));
// console.log(await new DomainCertificate(`${thisPath}/cache/domain.cert`));
