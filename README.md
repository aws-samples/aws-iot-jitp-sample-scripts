## AWS IoT Just In Time Provisioning Sample Scripts

These are sample scripts for demonstrating how to use a custom CA and Just In 
Time Provisioning (JITP) with AWS IoT at scale.

These scripts are not meant for production use, but are meant to help explain 
the steps involved in generating the necessary components.

These scripts also contain sample for using Amazon SQS and AWS Lambda to buffer 
and process messages.

Lastly there is a node.js based loadtest application for mimicking a number of 
publishers and subscribers. This application can be extended to simulate 
different workloads and behaviors.  

Required Software
-----------------

The scripts in this repository are primarly implemented with bash, awscli, and 
jq.  The client scripts which connect to AWS IoT are using the mosquitto_pub 
and mosquitto_sub MQTT clients.  OpenSSL is used for all of the private key and 
certificate generation. If you want to run the load test sample application, 
you will also need nodejs and npm.   

* bash
* sed
* make
* openssl		-- https://www.openssl.org/
* awscli		-- https://aws.amazon.com/cli/
* jq			-- https://stedolan.github.io/jq/
* mosquitto		-- https://mosquitto.org/
* nodejs		-- https://nodejs.org/


Scripts
-------

The bin directory contains a number of scripts which demonstrate how to work 
with AWS IoT Things with a custom CA certificate. These scripts are not 
intended for production use, but more aimed at making it easy to understand how 
the components of the system fit together: 

	bin/
	├── create-root		-- creates a custom root CA certificate
	├── create-thing	-- creates an AWS IoT Thing, Certificate, and Policy
	├── delete-thing	-- deletes an AWS IoT Thing, Certificate, and Policy
	├── device-status	-- get the status of the certificate for thedevice
	├── disable-certificate	-- disable the certificate attached to a device
	├── enable-certificate	-- enable the certificate attached to a device
	├── provision		-- creates a new signed certificate
	├── pub			-- publishes to AWS IoT using a signed certificate
	├── register		-- registers a custom root CA certificate with AWS IoT
	├── sub			-- subscribes to a AWS IoT topic with a certificate
	└── thing-certificates  -- lists the things and their certificates

Cloudformation Templates
------------------------

The Makefiles in the directories are meant to help manage the AWS CloudFormation 
stacks associated with these tools.  The top level Makefile will create a stack 
which contains an IAM role and an IoT Policy which are needed for Just in Time 
Provisioning. The IoTProvisioning role is referenced in the JITP template 
associated with your CA certificate.  This role allows the JITP system the 
necessary rights to create things, attach certificates and policies, and manage 
the related system resources.  The IoTAccess policy is also referenced in the 
provisioning template and provides the provisioned devices with their access 
rights to MQTT topics.  This policy restrict devices to only connect with a 
client id that matches the CommonName field of the certificate. It then allows 
all devices to subscribe to any topic but only publish to a topic that matches 
the CommonName of the device on the certificate.  In a production envrionment,
these policies would be more specific to the application requirements.

The sqs directory contains another AWS CloudFormation template that is intended to 
demonstrate forwarding MQTT messages to an Amazon SQS queue.  In this example, the 
items on the queue are consumed by a AWS Lambda function which merely logs the 
contents to CloudWatch.  For an actual production application, one would likely 
have several queues for different work loads, and multiple consumers processing
the messages from the queues.  The Amazon SQS queue provides a level of durability 
that makes it easier to scale the consumers for a given workload and allow for 
temporary stoppages of workers wihtout loss of events.

Finally, the load test application has it's own AWS CloudFormation template to 
provision a IoT Policy for the load test.  This policy is applied to the CA 
certificate used for the load test application, and is designed to enable the 
data flows for the load test.  It allows publishers to publish to 
"loadtest/$deviceId", and the subscribers publish to "loadtest", additionally 
the subscribers listen to "loadtest/#".  In a more production application, it 
is likely that one would have two CA certificates, one for the publishers and 
one for the subscribers, each with their own dedicated policies.  For our 
example, we are using the same CA for both as the process for creating a new CA 
with a different JITP template is exactly the same.

Load Test Application
---------------------

The loadtest application, is a sample node.js application that demonstrates 
both device to device and device to backend communication.  This application is 
designed to spawn a number of child processes, publishers which send a message 
once every second, and subscribers which recieve and forward the messages sent 
by the publishers to a "loadtest" topic, after modifing the message contents.  

For both the publishers and subscribers it generates a new device certificate 
for each signed by a custom CA.  The JITP infrastructure is used to attach 
them to a LoadTestPolicy in AWS IoT, and allow the devices to use the 
appropriate topics.  The loadtest code can be modified to do more useful work, 
and serve as the basis of various proofs of concept.

The sqs sample code is also setup to work in conjunction with the loadtest 
application, as it can attach the loadtest topic to a loadtestQueue Amazon SQS queue.  
This can be used to process the messages as they come in, and develop a feeling 
for how the various components add latency.  Like the loadtest code, the sqs 
code can be modified to actually process the incoming messages and do more 
realistic backend processing.  The code for the lambda function processing the 
incoming messages is found inline in the cloudformation template, but can be 
moved to an external file to make updating easier.

Getting Started
===============

This section will describe in detail how to create a CA certificate, register 
it with AWS IoT, and then provision and connect new devices to AWS IoT over 
MQTT using your custom CA certificate.

Deploy IAM role and IoT Policy
------------------------------

The first step is to deploy the AWS CloudFormation stack associated with this 
repository.  A Makefile is supplied that confers with a etc/config.mk file for 
a number of environment variables:

	AWS_STACK ?= iot-policy
	AWS_BUCKET ?= your-s3-bucket-name
	AWS_ACCOUNT ?= 999xxxxxxx
	AWS_REGION ?= eu-central-1

You will need an s3 bucket to temporarily store the generated template, you can 
set this using:

	aws s3 mb s3://your-s3-bucket-name

You can then set the config.mk file to contain just the name of the bucket.  
Similarly, you should set the ACCOUNT to your AWS AccountId and REGION to the 
region you want to deploy the stack to.

You don't need to use the config.mk, but can instead simply set these 
environment variables to the correct values.

	export AWS_STACK=iot-policy
	export AWS_BUCKET=your-s3-bucket-name
	export AWS_ACCOUNT=999xxxxxxx
	export AWS_REGION=eu-central-1

If you have a standard make command you should now be able to type:

	make deploy

This will process a AWS CloudFormation template and then deploy the associated 
stack.  This will run two commandlines:

	aws cloudformation package  \
		--s3-bucket $(AWS_BUCKET)  \
		--template-file etc/cloudformation.yaml \
		--output-template-file tmp/cloudformation.pkg.yaml

Which takes the template file in etc/cloudformation.yaml and generates a 
normalized version, and performs a basic set of check on the syntax. This step 
requires an s3 bucket to work. The second command:
	
	aws cloudformation deploy \
		--stack-name $(AWS_STACK) \
		--template-file tmp/cloudformation.pkg.yaml \
		--capabilities CAPABILITY_NAMED_IAM 

Then takes the normalized template and deploys it into your current region
and account.  As we are creating an IAM role, we need to add the capability
at runtime using the --capabilities flag.

Create a CA certificate
-----------------------

Once the role and policy are deployed, we will first generate a CA that we will 
use to provision device certificates:

	./bin/create-ca

This will generate two files:
	
	./root.ca.key
	./root.ca.pem

The first file is the private key for the CA.  This file should be carefully 
guarded as anyone with a copy of it can create new device certificates.  The 
second file is the x509 certificate for the CA which will serve as the root of 
trust for all of the device certificates.  This file will be installed in AWS 
IoT and used to validate your signed devices.  

The create-ca script takes a series of optional command line arugments:
	
create-ca CommonName Country Location State Organization OrganizationalUnit

The output files will be named "CommonName.ca.key" and "CommonName.ca.pem" 
accordingly.  You can use this to generate application specific CA certificates
that tie the provisioning profile to a specific application type.

Register CA with AWS IoT
------------------------

If you haven't already exported your account number, you can do so by typing:

	export AWS_ACCOUNT=999xxxxxx

Registering the CA with AWS IoT can then be done by running the command:

	./bin/register-ca

This will take the CA certificate and key generated in the last step.  Create
a sample CSR which will be used to generate a valid certificate, and then
send both to AWS IoT.  The service will then validate the signed certificate 
against the CA certificate, and register the provisioning template generated
from the file "etc/regfile.tmp" with the CA certificate.

If this command works, you can verify your CA certificate with:
	
	aws iot list-ca-certificates

This will list the CA certificates associated with your account in this region.
You can have up to 10 CA certificates per region.

Create you first device
-----------------------

Now that you have a CA certificate registered with AWS IoT, you can create
a device certificate.

	./bin/provision deviceName

This will create a private key and a x509 certificate for the device:

	deviceName.crt
	deviceName.key

In addition to these files, the device should have one or more of the AWS
ATS endpoint certificates:

	RSA 2048 bit
	https://www.amazontrust.com/repository/AmazonRootCA1.pem

	RSA 4096 bit
	https://www.amazontrust.com/repository/AmazonRootCA2.pem

	ECC 256 bit
	https://www.amazontrust.com/repository/AmazonRootCA3.pem
	
	ECC 384 bit
	https://www.amazontrust.com/repository/AmazonRootCA4.pem

The Symantec certificate is the legacy certificate, and is currently
deprecated.  It is highly recommended that if possible you use more
than one of the ATS endpoint certificates.  Obviously, if your device
or software library is contstrained it may not be possible to support
all 4 encryption standards.

Connect your device
-------------------

To connect your device to AWS IoT, you can first discover your ATS endpoint
using the command:

	aws iot describe-endpoint --type iot:Data-ATS

This will return the URL for the AWS IoT endpoint using the above ATS root
certificates.  Supplied in the repo are a bin/pub and a bin/sub which 
demonstrate using this command in conjunction with mosquitto_pub and 
mosquitto_sub respectively to connect to AWS IoT.

The IoTAccess policy is configured to allow your certificates to subscribe
to any topic, where as each device can only publish to it's specific topic,
with the same name as it's CommonName certificate attribute.  The MQTT client
id must also match the certificate's CommonName attribute as well, meaning
that only one device may use a given certificate at a time.

To try these out first create two new device certificates:

	./bin/provision producer
	./bin/provision subscriber

This will create a .key and a .crt file for each in the current working
directory.  You can then start the subscriber by running:

	./bin/sub subscriber

It will then inform you that it is listening on the topic wildcard # and
will connect twice, first to provision the certificate, and then a second
time to actually start the subscription.

Then after the subscriber is started you can run:

	./bin/pub publisher
	./bin/pub publisher hello world

The first run will error out with a premature connection lost, but this will
start the JITP for the publisher certificate, and the second time it will
send the message "hello world" on the topic "publisher" to to the subscriber.

It is important to be aware that the JITP process closes the initial connection
from a new certificate, and as such reconnect logic should take this into 
account when writing a production application.  As part of a factory test
procedure, it is a good idea to have each device under test connect with it
factory provisioned certificate before shipping to the end customer.  Note
well that each time the device connects to a new region, this process will
also occur.

Amazon SQS and AWS IoT
======================

Many applications that operate with AWS IoT require a persistent subscriber
on a number of topics to process the incoming device data.  While MQTT has
the ability to retain the latest telemetry from a device by setting the 
retain flag, this is not suitable for applications which require either
frequent updates or monitoring and recording over a long period of time.

One of the easiest way to add this soft of persistent consumer is to forward
messages via a AWS IoT Rule to an Amazon SQS queue.  The queue will provide
a reliable buffer with delivery gurantees, that can persist beyond the most
recent value on a given topic.  Additionally, an Amazon SQS queue can have
multiple consumers which will process the incoming messages, and can provide
buffering during backend system upgrades or during backend scaling operations.

In the sqs directory, there is a cloudformation.yaml which will configure a
new stack using AWS CloudFormation that provisions:

* a named Amazon SQS queue
* an IAM role that allows AWS IoT to publish to that queue
* an AWS IoT Topic Rule which will forward all messages on topic to that queue
* an IAM role to allow an AWS Lambda function to process that queue
* an AWS Lambda function which will simply log each message
* an AWS Lambda Event Source which binds the queue to the function

This setup will result in each message on the queue being consumed immediately
by a AWS Lambda function, and provides a good example of using a serverless
architecture for automatically scaling event processing. 

Like with the other Makefile there is a config.mk like the other templates.
You should either populate the environment variables:

	export AWS_STACK=loadtest-stack
	export AWS_BUCKET=your-s3-bucket-name
	export AWS_ACCOUNT=999xxxxxxx
	export AWS_REGION=eu-central-1
	export AWS_TOPIC=loadtest

Or setup the config.mk file with the appropriate overrides:

	AWS_STACK ?= loadtest-stack
	AWS_BUCKET ?= your-s3-bucket
	AWS_ACCOUNT ?= 999xxxxxxx
	AWS_REGION ?= eu-central-1
	AWS_TOPIC ?= loadtest

The loadtest code assumes that the topic that all of the test results are
written to is called loadtest.  This topic will be consumed by the AWS 
Lambda function and logged to Amazon CloudWatch logs. 

To install the stack you can type:

	make deploy

To deploy the stack by hand you can use the command lines:

	aws cloudformation package \
		--s3-bucket $(AWS_BUCKET) \
		--template-file cloudformation.yaml \
		--output-template-file cloudformation.pkg.yaml

which will generate the normalized cloudformation template, and:

	aws cloudformation deploy --stack-name $(AWS_STACK) \
		--template-file cloudformation.pkg.yaml \
		--capabilities CAPABILITY_NAMED_IAM \
		--parameter-overrides TopicName=$(AWS_TOPIC)

which will deploy the stack.  In the second command, the --parameters-overrides
argument demonstrates how you can override CloudWatch parameters at run time.
This is very useful when you need to deploy multiple variants of a stack,
which are dedicated to specific use cases such as deploying individual stacks
per customer, or setting values specific to development, staging, or 
production.  

Once deployed, the rule will be active and all messages sent to the topic
"loadtest" will be forward to the "loadtestQueue" Amazon SQS queue.  The
AWS Lambda function will also be active, so these messages will be almost
immediately consumed from the queue and processed.  To create a backlog of
items in the queue, you can disable the AWS Lambda function:

	aws lambda update-event-source-mapping \
		--no-enabled \
		--uuid $(aws lambda list-event-source-mappings \
			| jq -r '.EventSourceMappings \
			| .[] \
			| select( \
				.FunctionArn | contains("SQSProcessLambda")) \
			| .UUID')

This will update the Event Source Mapping to be in a disabled state, and
will stop the flow of messages to the AWS Lambda function.  You can re-enable
it using the same command changing the --no-enabled to --enabled.

For a production application, you can create a queue for each batch of 
processors who need access to the data on a topic.  Additionally, the IoT
rule can provide additional selection criteria in matching the data sent
to the queue.  By modifying the topic rule's SQL statement, you can select
only the data you need to be forwarded to the queue.

Load Test Sample Application
============================

The loadtest directory contains a node.js application that can simulate 
thousands of devices on a single machine.  The exact behavior is tunable
at runtime, but the general concept is:

	1.) The application uses a CA certificate to create a number of
		device certificates for publishers and subscribers
	2.) Each publisher device sends one message per second to a topic
		of a matching name to it's device id (pub#)
	3.) Each subscriber receieves each message and modifies it to 
		contain the time at which it processed it
	4.) Each subscriber then fowards that message to a loadtest topic
		with the modified contents

By default it will create a single publisher and a single subscriber resulting
in 3 messages per second.  The number of messages per second can be calculated
as:
	publishers * (1 + 2*subscribers)

So if you have 3 publishers and 2 subscribers, you should expect:

		 3 * (1+2*2) = 15

The breakdown between inbound and outbound are as follows:

	inbound: 	publishers * ( 1 + subscribers )
	outbound:	publishers * subscribers

messages per second.  On a typical server, you should be able to simulate
approximately 500 devices communicating.  Assuming you had 20 subscribers,
and 487 publishers, you should see approximately 20000 messages per second.

Currently accounts default to a maximum of 20000 inbound and 20000 outbound
messages per second, and you can adjust the numbers to exceed this throughput.
With this setup you will hit the inbound limit before you hit the outbound
limit in all cases.

Test Setup
----------

To prepare to run a loadtest you will first need to install node.js v10, and
the dependencies for the loadtest application. To install the application
dependencies you can simply type:

	npm install .

After the dependencies are installed, you need to specify the AWS gateway
to use:

	export AWS_IOT_ENDPOINT=$(aws iot describe-endpoint \
		| jq -r \'.["endpointAddress"]\')


Then you can setup a loadtest with a number of device certificates by typing:

	./loadtest -setup -subscribers 3 -producers 10

This will create 3 subscriber certificates and 10 producer certificates.  After
this we can run the loadtest with those values:

	./loadtest -loadtest -subscribers 3 -producers 10

This will start up all 13 subprocesses which will start sending messages 
immediately.  If you have configured the Amazon SQS queue as above

## License Summary

This sample code is made available under a modified MIT license. See the LICENSE file.
