
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/escalarmulfix.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

template PublicKey() {
  signal input in;
  signal output out[2];

  component privBits = Num2Bits(253);
  privBits.in <== in;

  var BASE8[2] = [
    5299619240641551281634865583518297030282874472190772894086521144482721001553,
    16950150798460657717958625567821834550301663161624707787222815936182638968203
  ];

  component mulFix = EscalarMulFix(253, BASE8);
  for (var i = 0; i < 253; i++) {
    mulFix.e[i] <== privBits.out[i];
  }

  out[0] <== mulFix.out[0];
  out[1] <== mulFix.out[1];
}

template ZkIdentity(groupSize) {
  signal input publicKeys[groupSize][2];

  signal input privateKey;

  component publicKey = PublicKey();
  publicKey.in <== privateKey;

  var sum = 0;

  component equals[groupSize][2];
  for (var i = 0; i < groupSize; i++) {
    equals[i][0] = IsEqual();
    equals[i][1] = IsEqual();

    equals[i][0].in[0] <== publicKeys[i][0];
    equals[i][0].in[1] <== publicKey.out[0];

    equals[i][1].in[0] <== publicKeys[i][1];
    equals[i][1].in[1] <== publicKey.out[1];

    sum += equals[i][0].out;
    sum += equals[i][1].out;
  }
  sum === 2;
}

// Main entry point
component main {public [publicKeys]}= ZkIdentity(1);