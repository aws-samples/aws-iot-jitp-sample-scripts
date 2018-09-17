# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

include etc/config.mk

AWS_IOT_ENDPOINT=$(shell aws iot describe-endpoint | jq -r '.["endpointAddress"]')

start:
	AWS_IOT_ENDPOINT=$(AWS_IOT_ENDPOINT) npm start

install:
	npm install .
	mkdir -p tmp/
	aws cloudformation package --s3-bucket $(BUCKET) --template-file etc/cloudformation.yaml --output-template-file tmp/cloudformation.pkg.yaml
	aws cloudformation deploy --stack-name $(STACK) --template-file tmp/cloudformation.pkg.yaml --capabilities CAPABILITY_NAMED_IAM 

