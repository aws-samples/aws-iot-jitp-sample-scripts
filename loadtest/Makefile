# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

include etc/config.mk

AWS_IOT_ENDPOINT=$(shell aws iot describe-endpoint --endpoint-type iot:Data-ATS | jq -r '.["endpointAddress"]')

start:
	AWS_IOT_ENDPOINT=$(AWS_IOT_ENDPOINT) npm start

install:
	npm install .
	mkdir -p {tmp,certs}/

build: install
	aws cloudformation package --s3-bucket $(AWS_BUCKET) --template-file etc/cloudformation.yaml --output-template-file tmp/cloudformation.$(AWS_STACK).pkg.yaml

deploy:	build
	aws cloudformation deploy --stack-name $(AWS_STACK) --template-file tmp/cloudformation.$(AWS_STACK).pkg.yaml --capabilities CAPABILITY_NAMED_IAM 

