Getting Started With AWS Greengrass
===================================

To install AWS Greengrass in a fresh AWS Cloud9 environment:

	make deploy BUCKET=goehd

You can verify that the greengrass role is associated to your account with

	aws greengrass get-service-role-for-account

If not you will need to associate the role.

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

