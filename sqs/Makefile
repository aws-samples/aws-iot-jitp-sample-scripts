# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

include etc/config.mk

.PHONY: build deploy delete log sqs loadtest 

all: deploy

build: 
	aws cloudformation package --s3-bucket $(AWS_BUCKET) --template-file etc/cloudformation.yaml --output-template-file tmp/cloudformation.pkg.yaml

deploy: build
	aws cloudformation deploy --stack-name $(AWS_STACK) --template-file tmp/cloudformation.pkg.yaml --capabilities CAPABILITY_NAMED_IAM 

delete:
	aws cloudformation delete-stack --stack-name $(AWS_STACK)

log:
	aws cloudformation describe-stack-events --stack-name $(AWS_STACK)

sqs:

include config.mk

all: deploy

build: 
	aws cloudformation package --s3-bucket $(AWS_BUCKET) --template-file cloudformation.yaml --output-template-file cloudformation.pkg.yaml

deploy: build
	aws cloudformation deploy --stack-name $(AWS_STACK) --template-file cloudformation.pkg.yaml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides TopicName=$(AWS_TOPIC)

delete:
	aws cloudformation delete-stack --stack-name $(AWS_STACK)

log:
	aws cloudformation describe-stack-events --stack-name $(AWS_STACK)
