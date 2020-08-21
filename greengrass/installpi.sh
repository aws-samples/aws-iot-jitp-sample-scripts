#!/bin/bash

# Variable
REGION=${REGION:-`aws configure get region`}
RASPBERRY=${RASPBERRY:-pi@raspberrypi.fritz.box}
GGURL=https://d1onfpft10uf5o.cloudfront.net/greengrass-core/downloads/1.10.2/greengrass-linux-armv7l-1.10.2.tar.gz
GGTARBALL=greengrass-linux-armv7l-1.10.2.tar.gz
SSMURL=https://s3.$REGION.amazonaws.com/amazon-ssm-$REGION/latest/debian_arm/amazon-ssm-agent.deb 
SSMAGENT=amazon-ssm-agent.deb


# Create a session token for provisioning the CA
aws sts assume-role --role-arn  arn:aws:iam::097591811552:role/IoTAdmin  --role-session-name provision > credentials
ACCESSKEYID=`jq -r .Credentials.AccessKeyId < credentials`
SECRETACCESSKEY=`jq -r .Credentials.SecretAccessKey < credentials`
SESSIONTOKEN=`jq -r .Credentials.SessionToken < credentials`

echo "AccessKeyId $ACCESSKEYID"
echo "SecretAccessKey $SECRETACCESSKEY"
echo "SessionToken $SESSIONTOKEN"

case "$1" in
clean)
ssh $RASPBERRY <<CLEAN
rm -f $GGTARBALL
rm -f $SSMAGENT
CLEAN
;;
*)
# create an SSM activation
aws ssm create-activation --iam-role AutomationServiceRole > activation.json
ACTIVATION_ID=`jq -r .ActivationId <activation.json`
ACTIVATION_CODE=`jq -r .ActivationCode <activation.json`

echo "SSM ID $ACTIVATION_ID"
echo "SSM CODE $ACTIVATION_CODE"

ssh $RASPBERRY <<GGSETUP
# Prep the install to have the runtimes we need

echo "installing"

sudo apt-get update
sudo apt-get upgrade -y

if [[ -z \`which jq\` ]]; then
	sudo apt install jq -y

if [[ -z \`which aws\` ]]; then
	sudo apt install awscli -y
fi

if [[ -z \`which python3\` ]]; then
	sudo apt install python3 -y
fi

if [[ -z \`which java8\` ]]; then
	sudo apt install openjdk-8-jdk -y
	sudo ln -sf /usr/bin/java /usr/bin/java8
fi

if [[ -z \`which openssl\` ]]; then
	sudo apt install openssl -y
fi

# Configure credentials
export AWS_ACCESS_KEY_ID=$ACCESSKEYID
export AWS_SECRET_ACCESS_KEY=$SECRETACCESSKEY
export AWS_SESSION_TOKEN=$SESSIONTOKEN

# Downlaod the appropriate SSM deb
if [[ ! -f $SSMAGENT ]]; then
	wget $SSMURL
fi

if [[ ! -f $SSMAGENT ]]; then 
	echo "Failed to download $SSMAGENT"
	exit 1
fi

# Install the agent
if [[ -f $SSMAGENT ]]; then
	sudo dpkg -i $SSMAGENT
	sudo service amazon-ssm-agent stop
	sudo amazon-ssm-agent -register -code $ACTIVATION_CODE -id $ACTIVATION_ID -region $REGION
	sudo service amazon-ssm-agent start
fi

# Download the appropriate version
if [[ ! -f $GGTARBALL ]]; then
	wget $GGURL
fi

if [[ ! -f $GGTARBALL ]]; then 
	echo "Failed to download $GGTARBALL"
	exit 1
fi

# install in /greengrass
if [[ ! -d /greengrass ]]; then
	sudo mkdir -p /greengrass
	sudo tar -C/ -zxvf $TARBALL
fi

#  

GGSETUP

esac
