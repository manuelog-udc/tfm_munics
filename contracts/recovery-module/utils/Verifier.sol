//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <=0.8.13;

import "./SafeUtils.sol";

library Pairing {

    struct G1Point {
        uint X;
        uint Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }

    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }

    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
    }

    /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory r) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }

    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)

            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-add-failed");
    }

    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }

    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }

    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }

    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }

    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}

contract Verifier is SafeUtils {
    using Pairing for *;

    event VerifyingKeysSubstituted(address indexed safeAddress, uint newNumberOfKeys);
    event VerifyingKeyInvalidated(address indexed safeAddress, uint invalidatedKey);
    event VerifyingKeyAdded(address indexed safeAddress, uint newNumberOfKeys);

    struct VerifyingKeys {
        Pairing.G1Point[] alfa1;
        Pairing.G2Point[] beta2;
        Pairing.G2Point[] gamma2;
        Pairing.G2Point[] delta2;
        Pairing.G1Point[3][] IC;
    }

    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[3] IC;
    }

    struct VerificationProof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
        uint[2] input;
    }
    
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    uint internal verifyingKeysSize;
    mapping(uint => VerifyingKey) private verifyingKeys;

    constructor(GnosisSafe safe, VerifyingKeys memory _verifyingKeys) SafeUtils(safe) {
        addVerifyingKeys(_verifyingKeys, false);
        verifyingKeysSize = _verifyingKeys.alfa1.length;
    }

    function addVerifyingKeys(VerifyingKeys memory _verifyingKeys, bool overwrite) private {
        for(uint i=0; i < _verifyingKeys.alfa1.length; i++) {
            _addVerifyingKey(VerifyingKey(_verifyingKeys.alfa1[i], _verifyingKeys.beta2[i], _verifyingKeys.gamma2[i],
            _verifyingKeys.delta2[i], _verifyingKeys.IC[i]), overwrite, i);
        }
    }
    
    function _addVerifyingKey(VerifyingKey memory verifyingKey, bool overwrite, uint index) private {
        verifyingKeys[index].alfa1 = verifyingKey.alfa1;
        verifyingKeys[index].beta2 = verifyingKey.beta2;
        verifyingKeys[index].gamma2 = Pairing.G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
            10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
            8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
        verifyingKeys[index].delta2 = verifyingKey.delta2;
        if(overwrite && index < verifyingKeysSize) delete verifyingKeys[index].IC;
        for(uint i = 0; i < verifyingKey.IC.length; i++) {
            verifyingKeys[index].IC[i] = verifyingKey.IC[i];
        }
    }

    function addVerifyingKey(VerifyingKey memory verifyingKey, uint index) external onlySafeOwner {
        _addVerifyingKey(verifyingKey, true, index);
        if(index >= verifyingKeysSize)
            verifyingKeysSize++;
        emit VerifyingKeyAdded(safeAddress, verifyingKeysSize);
    }

    function substituteVerifyingKeys(VerifyingKeys memory _verifyingKeys) external onlySafeOwner {
        addVerifyingKeys(_verifyingKeys, true);
        if(_verifyingKeys.alfa1.length < verifyingKeysSize) {
            for(uint i = (verifyingKeysSize - _verifyingKeys.alfa1.length); i < verifyingKeysSize; i++) {
                delete verifyingKeys[i];
            }
        }
        verifyingKeysSize = _verifyingKeys.alfa1.length;
        emit VerifyingKeysSubstituted(safeAddress, verifyingKeysSize);
    }

    function invalidateVerifyingKey(uint key) external onlySafeOwner {
        _invalidateVerifyingKey(key);
    }

    function _invalidateVerifyingKey(uint key) private {
        delete verifyingKeys[key];
        emit VerifyingKeyInvalidated(safeAddress, key);
    }

    function verify(uint[2] memory input, Proof memory proof, uint verifyingKeyIndex) private view returns (uint) {
        uint snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory verifyingKey = verifyingKeys[verifyingKeyIndex];
        require(input.length + 1 == verifyingKey.IC.length,"[verify]: Verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field,"[verify]: Verifier-gte-snark-scalar-field");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(verifyingKey.IC[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, verifyingKey.IC[0]);
        if (!Pairing.pairingProd4(
            Pairing.negate(proof.A), proof.B,
            verifyingKey.alfa1, verifyingKey.beta2,
            vk_x, verifyingKey.gamma2,
            proof.C, verifyingKey.delta2
        )) return 1;
        return 0;
    }

    /// @return r  bool true if proof is valid
    function verifyProof(VerificationProof memory verificationProof, uint verifyingKeyIndex) public returns (bool r) {
        Proof memory proof;
        proof.A = verificationProof.a;
        proof.B = verificationProof.b;
        proof.C = verificationProof.c;
        uint[2] memory inputValues = verificationProof.input;
        if (verify(inputValues, proof, verifyingKeyIndex) == 0) {
            _invalidateVerifyingKey(verifyingKeyIndex);
            return true;
        } else {
            return false;
        }
    }
}