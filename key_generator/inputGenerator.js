const { genPrivateKey, genPublicKey, formatBabyJubJubPrivateKey } = require("./utils/crypto");
const { stringifyBigInts } = require("snarkjs");
const fs = require('fs');

const generateInputFilesContent = (sk, pks) => {
    const recoveryModuleInputs = { privateKey: formatBabyJubJubPrivateKey(sk), publicKeys: pks }
    let inputJson = stringifyBigInts(recoveryModuleInputs)
    return JSON.stringify(inputJson)
}

const main = () => {
    numberOfInputs = parseInt(process.argv[2])
    if(numberOfInputs > 0) {
        for(let i = 1; i <= numberOfInputs; i++) {
            secreteKey = genPrivateKey()
            publicKey = genPublicKey(secreteKey)
            const outputFolder = "../circom/inputs"
            fs.mkdirSync(outputFolder, { recursive: true })
            const outputFile = outputFolder + "/input" + String(i) + ".json"
            fs.writeFile(outputFile, generateInputFilesContent(secreteKey, publicKey), err => {
                if (err)
                    console.error(err);
            });
        }
        console.log("The inputs have been generated.")
    } else {
        console.log("Invalid input. Please pass a number higher then 0.")
    }
};

main();