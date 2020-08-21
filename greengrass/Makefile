
STACKNAME ?= greengrassjitp
CODEBUCKET ?= goehd
IOTENDPOINT=$(shell aws iot describe-endpoint --endpoint-type iot:Data-ATS | jq -r .endpointAddress)

all : 

greengrassProvisioner.zip: greengrassProvisioner/index.js
	cd greengrassProvisioner && npm i
	cd greengrassProvisioner && zip ../greengrassProvisioner.zip *

jitp: greengrassProvisioner.zip etc/cloudformation.yaml
	aws s3 cp greengrassProvisioner.zip s3://$(CODEBUCKET)/
	aws cloudformation package --template-file etc/cloudformation.yaml --output-template-file cloudformation.pkg --s3-bucket $(CODEBUCKET)
	aws cloudformation deploy --stack-name $(STACKNAME) --template-file cloudformation.pkg --capabilities CAPABILITY_NAMED_IAM --parameter-overrides CodeBucket=$(CODEBUCKET) IoTEndpoint=$(IOTENDPOINT) Username=$(shell whoami)

clean:
	aws cloudformation delete-stack --stack-name $(STACKNAME)
	rm -f greengrassProvisioner.zip

pi:
