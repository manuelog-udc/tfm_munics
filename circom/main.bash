#!/bin/bash

if [[ -z $1 ]]; then
    echo "You must pass as an argument the number of circuits to be compiled."; exit
fi

node ../key_generator/inputGenerator.js $1
bash verifying_key/prepare_verifying_key_params.bash $1