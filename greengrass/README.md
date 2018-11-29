Getting Started With AWS Greengrass
===================================

To install AWS Greengrass in a fresh AWS Cloud9 environment:

	curl https://raw.githubusercontent.com/aws-samples/aws-iot-jitp-sample-scripts/reinvent/bin/getting-started-with-greengrass | bash

This will install all of the necessary dependencies and configure the system
for running AWS Greengrass.

You can then switch to the greengrass sample script directory:

	cd aws-iot-jitp-sample-script/greengrass
	
Then you will need to install the dependencies

	npm i -g aws-cdk
	npm i 

The first step is to deploy the necessary provisioning resource in AWS using
the AWS CDK:

	npm run build
	cdk bootstrap
	cdk deploy

One you have successfully deployed the GreengrassStack you have the ability to
create a new certificate authority for signing your AWS Greengrass core
certificates:

	./bin/create-ca

Next if you export your account ID you can register your new CA certificate
with AWS IoT

	export AWS_ACCOUNT=09xxxxx
	./bin/register-ca

At this point you will have a AWS IoT provisioning template registered with
AWS IoT that will allow you to register new AWS Greengrass cores by signing
the device certificate with your CA certificate. 

To create a new AWS Greengrass core certificate and configuration simply run:

	./bin/provision gg

Which will create a new device certificate gg.crt and private key gg.key,
and the associated config.json file and install them in your /greengrass/certs
and /greengrass/config directories.

You can start your new greengrass deployment with:

	cd /greengrass/ggc/core
	sudo ./greengrassd start

