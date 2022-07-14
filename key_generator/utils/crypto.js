const crypto = require("crypto");
const { bigInt } = require("snarkjs");
const { babyJub, eddsa, mimcsponge } = require("circomlib");
const secp256k1 = require('secp256k1')

/* Helper functions */
const bigInt2Buffer = i => {
  return Buffer.from(i.toString());
};

const hash = (msg, k) => {
  if (k === undefined) {
    return multiHash([msg], 0n, 1);
  }

  return multiHash([msg], k, 1);
};

const multiHash = (arr, key, outputs) => {
  const ret = mimcsponge.multiHash(arr, key, outputs);

  if (Array.isArray(ret)) {
    return ret.map(x => bigInt(x));
  }
  return bigInt(ret);
};

const formatBabyJubJubPrivateKey = priv => {
  // Formats private key to be babyJubJub compatiable

  // https://tools.ietf.org/html/rfc8032
  const sBuff = eddsa.pruneBuffer(bigInt2Buffer(hash(priv)).slice(0, 32));
  return bigInt.leBuff2int(sBuff).shr(3);
};

const genPrivateKey = () => {
  while (true) {
    const privKey = crypto.randomBytes(32)
    if (secp256k1.privateKeyVerify(privKey)) return BigInt("0x" + privKey.toString("hex"))
  }
};

const genPublicKey = sk => {
  const s = formatBabyJubJubPrivateKey(sk);

  return babyJub.mulPointEscalar(babyJub.Base8, s);
};

module.exports = {
  genPrivateKey,
  genPublicKey,
  formatBabyJubJubPrivateKey
};