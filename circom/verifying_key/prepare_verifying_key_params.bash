#!/bin/bash

source verifying_key/utils/utils.bash

if [[ -z $1 ]]; then
    echo "You must pass as an argument the number of circuits to be compiled."; exit
fi

initialComprobations

for i in $(eval echo {1..$1}); do
    circom ./circuit/recoveryModule.circom --r1cs --sym --c -o circuit/

    make -C circuit/recoveryModule_cpp
    ./circuit/recoveryModule_cpp/recoveryModule "inputs/input${i}.json" "circuit/recoveryModule_cpp/witness${i}.wtns"

    ../node_modules/.bin/snarkjs powersoftau new bn128 12 "powers_of_tau/pot12_0000.ptau"

    ../node_modules/.bin/snarkjs powersoftau contribute "powers_of_tau/pot12_0000.ptau" "powers_of_tau/pot12_0001.ptau" --name="First contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"
    ../node_modules/.bin/snarkjs powersoftau contribute "powers_of_tau/pot12_0001.ptau" "powers_of_tau/pot12_0002.ptau" --name="Second contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"
    ../node_modules/.bin/snarkjs powersoftau contribute "powers_of_tau/pot12_0002.ptau" "powers_of_tau/pot12_0003.ptau" --name="Third contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"

    ../node_modules/.bin/snarkjs powersoftau verify "powers_of_tau/pot12_0003.ptau"

    ../node_modules/.bin/snarkjs powersoftau beacon "powers_of_tau/pot12_0003.ptau" "powers_of_tau/pot12_beacon.ptau" $(head -n 4096 /dev/urandom | sha256sum) 10 -n="Final Beacon Powers of Tau"

    ../node_modules/.bin/snarkjs powersoftau prepare phase2 "powers_of_tau/pot12_beacon.ptau" "phase2/pot12_final.ptau"

    ../node_modules/.bin/snarkjs powersoftau verify "phase2/pot12_final.ptau"

    ../node_modules/.bin/snarkjs groth16 setup "circuit/recoveryModule.r1cs" "phase2/pot12_final.ptau" "phase2/recoveryModule_0000.zkey"

    ../node_modules/.bin/snarkjs zkey contribute "phase2/recoveryModule_0000.zkey" "phase2/recoveryModule_0001.zkey" --name="First contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"
    ../node_modules/.bin/snarkjs zkey contribute "phase2/recoveryModule_0001.zkey" "phase2/recoveryModule_0002.zkey" --name="Second contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"
    ../node_modules/.bin/snarkjs zkey contribute "phase2/recoveryModule_0002.zkey" "phase2/recoveryModule_0003.zkey" --name="Third contribution" -e="$(head -n 4096 /dev/urandom | openssl sha256)"

    ../node_modules/.bin/snarkjs zkey verify "circuit/recoveryModule.r1cs" "phase2/pot12_final.ptau" "phase2/recoveryModule_0003.zkey"

    ../node_modules/.bin/snarkjs zkey beacon "phase2/recoveryModule_0003.zkey" "phase2/recoveryModule_final${i}.zkey" $(head -n 4096 /dev/urandom | sha256sum) 10 -n="Final Beacon phase2"

    ../node_modules/.bin/snarkjs zkey verify "circuit/recoveryModule.r1cs" "phase2/pot12_final.ptau" "phase2/recoveryModule_final${i}.zkey"

    ../node_modules/.bin/snarkjs zkey export verificationkey "phase2/recoveryModule_final${i}.zkey" "phase2/verification_key${i}.json"

    ../node_modules/.bin/snarkjs groth16 prove "phase2/recoveryModule_final${i}.zkey" "circuit/recoveryModule_cpp/witness${i}.wtns" "proofs/proof${i}.json" "proofs/public${i}.json"

    ../node_modules/.bin/snarkjs groth16 verify "phase2/verification_key${i}.json" "proofs/public${i}.json" "proofs/proof${i}.json"

    ../node_modules/.bin/snarkjs zkey export solidityverifier "phase2/recoveryModule_final${i}.zkey" "solidity/verifier${i}.sol"
    
    generateVerifyingKeys $i
    generateProofs $i
done