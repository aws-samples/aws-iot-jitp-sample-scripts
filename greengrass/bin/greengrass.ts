#!/usr/bin/env node
import sns = require('@aws-cdk/aws-sns');
import sqs = require('@aws-cdk/aws-sqs');
import lambda = require('@aws-cdk/aws-lambda');
import iot = require('@aws-cdk/aws-iot');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
const aws = require('aws-sdk');

class GreengrassStack extends cdk.Stack {
	constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
		super(parent, name, props);

		const queue = new sqs.Queue(this, 'GreengrassProvisioningQueue', {
			visibilityTimeoutSec: 300
		});

		const topic = new sns.Topic(this, 'GreengrassProvisioiningTopic');

		topic.subscribeQueue(queue);

		const greengrassConsumerRole = new iam.Role(this,'GreengrassConsumerRole', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
		});

		greengrassConsumerRole.addToPolicy(new iam.PolicyStatement().addActions(
			"sqs:DeleteMessage",
 			"sqs:ChangeMessageVisibility",
			"sqs:ReceiveMessage",
			"sqs:GetQueueAttributes",
		).addResource(queue.queueArn));
		greengrassConsumerRole.addToPolicy(new iam.PolicyStatement().addActions(
			"logs:*"
		).addResource("*"));

		const fn = new lambda.Function(this, 'GreengrassProvisionFunction', {
			runtime: lambda.Runtime.NodeJS810,
			handler: 'index.handler',
			code: lambda.Code.asset('./greengrassProvisioner'),
			role: greengrassConsumerRole
		});

		fn.addEnvironment("AWS_IOT_ENDPOINT",parent.getContext('iotendpoint'))

		new lambda.cloudformation.EventSourceMappingResource(this,'GreengrassProvisioningMapping', {
			batchSize: 1,
			enabled: true,
			eventSourceArn: queue.queueArn,
			functionName: fn.functionName
		});

		const greengrassPublisherRole = new iam.Role(this,'GreengrassPublisherRole', {
			assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
		});
		greengrassPublisherRole.addToPolicy(new iam.PolicyStatement().addActions(
			"sqs:SendMessage"
		).addResource(queue.queueArn));
	
		new iot.cloudformation.TopicRuleResource(this, 'GreengrassPublisher',  {
			topicRulePayload: {
				awsIotSqlVersion: "2016-03-23",
				sql: "SELECT * FROM '$aws/events/thing/+/created'",
				ruleDisabled: false,
				actions: [{
					sqs: {
						queueUrl: queue.queueUrl,
						roleArn: greengrassPublisherRole.roleArn,
						UseBase64: false
					}
				}]
			}
		});
	
		new iot.cloudformation.PolicyResource(this, 'GreengrassPolicy', {
			policyName: 'GreengrassPolicy',
			policyDocument: {
				"Version": "2012-10-17",
				"Statement": [
					{
						"Effect": "Allow",
						"Action": [
							"iot:*"
						],
						"Resource": "*"
					}
				]
			}
		})

		const provisioningRole = new iam.Role(this,'GreengrassProvisioningRole', {
			assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
		});
		provisioningRole.addToPolicy(new iam.PolicyStatement().addActions(
			"iot:AddThingToThingGroup",
			"iot:AttachPrincipalPolicy",
			"iot:AttachThingPrincipal",
			"iot:CreateCertificateFromCsr",
			"iot:CreatePolicy",
			"iot:CreateThing",
			"iot:DescribeCertificate",
			"iot:DescribeThing",
			"iot:DescribeThingGroup",
			"iot:DescribeThingType",
			"iot:DetachThingPrincipal",
			"iot:GetPolicy",
			"iot:ListPolicyPrincipals",
			"iot:ListPrincipalPolicies",
			"iot:ListPrincipalThings",
			"iot:ListThingGroupsForThing",
			"iot:ListThingPrincipals",
			"iot:RegisterCertificate",
			"iot:RegisterThing",
			"iot:RemoveThingFromThingGroup",
			"iot:UpdateCertificate",
			"iot:UpdateThing",
			"iot:UpdateThingGroupsForThing"
		).addResource("*"))

		provisioningRole.addToPolicy(new iam.PolicyStatement().addActions(
			"logs:CreateLogGroup",
			"logs:CreateLogStream",
			"logs:PutLogEvents",
			"logs:PutMetricFilter",
			"logs:PutRetentionPolicy",
			"logs:GetLogEvents",
			"logs:DeleteLogStream"
		).addResource("*"))
                  
		provisioningRole.addToPolicy(new iam.PolicyStatement().addActions(
			"dynamodb:PutItem",
			"kinesis:PutRecord",
			"iot:Publish",
			"s3:PutObject",
			"sns:Publish",
			"sqs:SendMessage*",
			"cloudwatch:SetAlarmState",
			"cloudwatch:PutMetricData",
			"es:ESHttpPut",
			"firehose:PutRecord"
		).addResource("*"))

	}
}

interface EndpointResponse {
	endpointAddress : string;
}

async function endpoint(region: string ){
	let promise = new Promise( function(resolve,reject) {
		aws.config.update({ region: region })
		const iot = new aws.Iot()
		iot.describeEndpoint({ 'endpointType': 'iot:Data-ATS' }, function(err:any,data:EndpointResponse) {
			if (err) return reject(err)
			resolve(data.endpointAddress)
		})
	})
	return promise;
}

const app = new cdk.App();
endpoint(app.getContext('aws:cdk:toolkit:default-region')).then( (res) => {
	app.setContext('iotendpoint',res);
	new GreengrassStack(app, 'GreengrassStack');
	app.run();
})
