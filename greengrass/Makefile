
BUCKET ?= yourbuckethere
STACKNAME ?= yourstackhere

provisioner.zip:
	cd greengrassProvisioner && zip ../provisioner.zip *
	aws s3 cp provisioner.zip $(BUCKET)

package: provisioner.zip
	aws cloudformation package --template-file etc/cloudformation.yaml --s3-bucket $(BUCKET) --output-template-file cloudformation.pkg
	
deploy: package
	aws cloudformation deploy --template-file cloudformation.pkg --capabilities CAPABILITY_IAM --stack-name $(STACKNAME) --parameter-overrides CodeBucket=$(BUCKET)


