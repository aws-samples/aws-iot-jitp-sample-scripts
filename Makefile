# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

include etc/config.mk

.PHONY: build deploy delete log sqs loadtest certificate register-ca

all: 
	@echo "export AWS_BUCKET=your_bucket_name"
	@echo "export AWS_STACK=your_stack_name"

build: tmp/cloudformation.pkg.yaml

tmp/cloudformation.pkg.yaml: 
	aws cloudformation package --s3-bucket $(AWS_BUCKET) --template-file etc/cloudformation.yaml --output-template-file tmp/cloudformation.pkg.yaml

deploy: tmp/cloudformation.pkg.yaml
	aws cloudformation deploy --stack-name $(AWS_STACK) --template-file tmp/cloudformation.pkg.yaml --capabilities CAPABILITY_NAMED_IAM 

delete:
	aws cloudformation delete-stack --stack-name $(AWS_STACK)

log:
	aws cloudformation describe-stack-events --stack-name $(AWS_STACK)

sqs:
	cd sqs && $(MAKE) deploy

loadtest:
	cd loadtest && $(MAKE) install
	cd loadtest && $(MAKE) start

certificate:
	./bin/create-ca

register-ca:
	./bin/register-ca
