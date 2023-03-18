# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

include ./etc/config.mk

all: deploy

build: 
	aws cloudformation package --s3-bucket $(AWS_BUCKET) --template-file etc/cloudformation.yaml --output-template-file /dev/shm/cloudformation.$(AWS_STACK).yaml

deploy: build
	aws cloudformation deploy --stack-name $(AWS_STACK) --template-file /dev/shm/cloudformation.$(AWS_STACK).yaml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides TopicName=$(AWS_TOPIC)

delete:
	aws cloudformation delete-stack --stack-name $(AWS_STACK)

log:
	aws cloudformation describe-stack-events --stack-name $(AWS_STACK)
