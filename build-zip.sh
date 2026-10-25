#!/bin/sh
# Packages prototype/ as verigate-prototype.zip (unzips to verigate-prototype/).
set -e
cd "$(dirname "$0")"
rm -rf .zipstage verigate-prototype.zip
mkdir -p .zipstage
cp -R prototype .zipstage/verigate-prototype
(cd .zipstage && zip -rq -X ../verigate-prototype.zip verigate-prototype)
rm -rf .zipstage
echo "Built verigate-prototype.zip"
