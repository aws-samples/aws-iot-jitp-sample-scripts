const aws = require('aws-sdk')
const uuid = require('uuid')
const iot = new aws.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT })
const greengrass = new aws.Greengrass()
const iotapi = new aws.Iot()

const role_arn = process.env.GREENGRASS_ROLE
const region = process.env.AWS_REGION

aws.config.apiVersions = {
	greengrass: '2017-06-07',
}

function create_loggers(cb) {
	const logger_params = {
		InitialVersion: {
			Loggers: [{
					"Component": "Lambda",
					"Id": "DebugCloudLambda",
					"Level": "DEBUG",
					"Type": "AWSCloudWatch"
				},{
					"Component": "GreengrassSystem",
					"Id": "DebugCloudSystem",
					"Level": "DEBUG",
					"Type": "AWSCloudWatch"
				},{
					"Component": "Lambda",
					"Id": "DebugLocalLambda",
					"Level": "DEBUG",
					"Space": 25600,
					"Type": "FileSystem"
				},{
					"Component": "GreengrassSystem",
					"Id": "DebugLocalSystem",
					"Level": "DEBUG",
					"Space": 25600,
					"Type": "FileSystem"
				}
			]
		}
	}
	greengrass.createLoggerDefinition(logger_params, (err,data) => {
		if (err) return console.log(err)
		console.log(data)
		cb(data.LatestVersionArn)
	})
}

function create_core(name,arn,cert,cb) {
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
		cb(data.LatestVersionArn)
	})
}

function create_group(name,core,loggers,cb,) {
	var params = {
		InitialVersion: {
			CoreDefinitionVersionArn: core,
			LoggerDefinitionVersionArn: loggers,
		},
		Name: name
	}
	greengrass.createGroup(params, function(err, data) {
		if (err) return console.log(err, err.stack) // an error occurred
		console.log(data)           // successful response
		cb(data)
	})
}

function associate_role(name,role) {
	const params = {
		GroupId: name,
		RoleArn: role 
	}
	greengrass.associateRoleToGroup(params, function (err, data) {
		if (err) return console.log(err) // an error occurred
		console.log(data)           // successful response
	})
}

exports.handler = (event, context, callback) => {
	const message = JSON.parse(event.Records[0].body)
//	const message = event
	console.log(message)
	const name = message.thingName
	const group_name = name + '_group'
	const account = message.accountId
	const core_arn = "arn:aws:iot:" + region + ":" + account + ":thing/" + name

	iotapi.listThingPrincipals({ thingName: name }, (err,data) => {
		if (err) return console.log(err)
		console.log(data)
		const cert = data.principals[0]
		create_core(name,core_arn,cert,(core) => {
			create_loggers((loggers) => {
				create_group(group_name,core,loggers, (group) => {
					console.log(group)
					associate_role(group.Id,role_arn)
				})
			})
		})
	})
}

