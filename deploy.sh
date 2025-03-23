#!/bin/bash

WALLETADDRESS="aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px."
PRIVATEKEY="APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH."

APPNAME="mental_poker_trifecta.aleo"
PATHTOAPP=$(realpath -q $APPNAME)

RECORD='{
  RECORD PLAINTEXT HERE
}'

# Desplegar en la cadena local
echo "Desplegando $APPNAME en la cadena local..."
cd .. && snarkos developer deploy "${APPNAME}" --private-key "${PRIVATEKEY}" --query "http://localhost:3030" --path "./leo-program/build/" --priority-fee 1000000 --broadcast

# Si el despliegue falla, verificar que la carpeta build exista y tenga archivos
if [ $? -ne 0 ]; then
  echo "Error al desplegar. Verificando si el programa está compilado..."
  if [ ! -d "./leo-program/build/" ]; then
    echo "La carpeta build no existe. Compilando el programa..."
    cd leo-program && leo build
    cd .. && snarkos developer deploy "${APPNAME}" --private-key "${PRIVATEKEY}" --query "http://localhost:3030" --path "./leo-program/build/" --priority-fee 1000000 --broadcast
  fi
fi