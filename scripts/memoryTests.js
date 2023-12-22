import * as cbor from 'cbor-x';
import { encode } from '#utilities/serialize';
import sizeofvar from '@cldmv/sizeofvar';
const {
	decode: dec,
	encode: enc
} = cbor;
console.log(cbor);
const hex = '123412341234123412341234';
console.log(sizeofvar(Buffer.from(hex, 'hex')), sizeofvar(hex), sizeofvar(encode(hex)), sizeofvar(encode(Buffer.from(hex, 'hex'))));
console.log(encode(Buffer.from(hex, 'hex')).length, encode(hex).length);
console.log(enc(Buffer.from(hex, 'hex')).length, enc(hex).length);
