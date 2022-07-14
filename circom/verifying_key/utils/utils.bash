generateVerifyingKeys () {
    inputFile="solidity/verifier${1}.sol"
    outputFile="results/verifyingKeys.txt"
    regexArray=("vk\.alfa1 = Pairing\.G1Point\(" "vk\.beta2 = Pairing\.G2Point\(" "vk\.delta2 = Pairing\.G2Point\("
        "vk\.IC\[0\] = Pairing\.G1Point\(" "vk\.IC\[1\] = Pairing\.G1Point\(" "vk\.IC\[2\] = Pairing\.G1Point\(")
    for j in $(eval echo {0..5}); do
        regexResult=$(eval "awk '/${regexArray[$j]}/{flag=1; next} /\);/{flag=0} flag {\$1=\$1;print}' ${inputFile}")
        if [[ $j != 5 ]]; then
            regexResult="[${regexResult}],"
        else
            regexResult="[${regexResult}]"
        fi
        echo $regexResult >> $outputFile
    done
    echo "--iterationSplitter--" >> $outputFile
}

generateProofs () {
    output="results/proofCalls.txt"
    ../node_modules/.bin/snarkjs generatecall "proofs/public${1}.json" "proofs/proof${1}.json" >> $output
    echo "--iterationSplitter--" >> $output
}

initialComprobations () {
    date=$(date +'_%m_%d_%Y_%H:%M:%S')

    if [[ ! -d "powers_of_tau" ]]; then
        mkdir powers_of_tau
    fi
    if [[ ! -d "phase2" ]]; then
        mkdir phase2
    fi
    if [[ ! -d "proofs" ]]; then
        mkdir proofs
    fi
    if [[ ! -d "solidity" ]]; then
        mkdir solidity
    fi
    if [[ ! -d "results" ]] || [[ ! -d "results/saved" ]]; then
        mkdir results
        mkdir results/saved
    fi

    if [[ -f "results/verifyingKeys.txt" ]]; then
        mv "results/verifyingKeys.txt" "results/saved/verifyingKeys${date}.txt"
    fi

    if [[ -f "results/proofCalls.txt" ]]; then
        mv "results/proofCalls.txt" "results/saved/proofCalls${date}.txt"
    fi
}