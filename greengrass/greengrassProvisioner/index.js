cname,onst aws = require('aws-sdk')
const uuid = require('uuid')
const iot = new aws.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT })
const greengrass = new AWS.Greengrass()

const role_arn = process.env.SERVICE_ROLE_ARN

aws.config.apiVersions = {
	greengrass: '2017-06-07',
}

function create_loggers() {
	const logger_params = {
		InitialVersion: {
    			Loggers: [{
				Component: 'GreengrassSystem',
				Id: 'SystemDebug'
				Level: 'DEBUG',
				Space: 512000,
				Type: 'FileSystem'
			},{
				Component: 'Lambda',
				Id: 'SystemDebug'
				Level: 'DEBUG',
				Space: 512000,
				Type: 'FileSystem'
			},{
				Component: 'GreengrassSystem',
				Id: 'SystemDebug'
				Level: 'DEBUG',
				Space: 512000,
				Type: 'AWSCloudWatch'
			},{
				Component: 'Lambda',
				Id: 'SystemDebug'
				Level: 'DEBUG',
				Space: 512000,
				Type: 'AWSCloudWatch'
			}]
		}
	}
	greengrass.createLoggerDefinition(logger_params, (err,data) => {
		if (err) return console.log(err)	
		console.log(data)	
	})
}

function create_core(name,arn,cert) {
	const params = {
		InitialVersion: {
			Cores: [{
				CertificateArn: cert,
				Id: name,
				SyncShadow: true,
				ThingArn: arn
			}]
		},
		Name: name
	}
	greengrass.createCoreDefinition(params,(err,data) => {
		if (err) return console.log(err)
		console.log(data)
	})
}

function create_group(name) {
	var params = {
		AmznClientToken: 'STRING_VALUE',
		InitialVersion: {
			CoreDefinitionVersionArn: 'STRING_VALUE',
			DeviceDefinitionVersionArn: 'STRING_VALUE',
			FunctionDefinitionVersionArn: 'STRING_VALUE',
			LoggerDefinitionVersionArn: 'STRING_VALUE',
			ResourceDefinitionVersionArn: 'STRING_VALUE',
			SubscriptionDefinitionVersionArn: 'STRING_VALUE'
		},
		Name: 'STRING_VALUE'
	}
	greengrass.createGroup(params, function(err, data) {
		if (err) return console.log(err, err.stack) // an error occurred
		console.log(data)           // successful response
	})
}

function associate_role(name,role) {
	const params = {
		GroupId: name + "_group",
		RoleArn: role 
	}
	greengrass.associateRoleToGroup(params, function (err, data) {
		if (err) return console.log(err) // an error occurred
		console.log(data)           // successful response
	})
}

exports.handler = (event, context, callback) => {
	const message = JSON.parse(event.Records[0].body)
	console.log(message)
	const cert = message.cert // TODO
	const name = message.name // TODO
	const group_name = name + '_group'
	const core_arn = 

	create_core(name,core_arn,cert)
	create_loggers()
	create_group(group_name)
	associate_role(group_name,role_arn)
}
