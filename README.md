# homebridge-vorwerk

This is a plugin for [homebridge](https://github.com/nfarina/homebridge) to control your [Vorwerk Kobold](https://kobold.vorwerk.de/saugroboter/) VR200 and VR300 vacuum robot. You can download it via [npm](https://www.npmjs.com/package/homebridge-vorwerk).

Based on naofireblade's [homebridge-neato](https://github.com/naofireblade/homebridge-neato).

Feel free to leave any feedback [here](https://github.com/nicoh88/homebridge-vorwerk/issues).

<img src="https://raw.githubusercontent.com/nicoh88/homebridge-vorwerk/master/vorwerk-kobold-vr200.jpg" style="border:1px solid lightgray" alt="Vorwerk Kobold VR200" width="300">&nbsp;&nbsp;&nbsp;<img src="https://raw.githubusercontent.com/nicoh88/homebridge-vorwerk/master/vorwerk-kobold-vr300.jpg" style="border:1px solid lightgray" alt="Vorwerk Kobold VR300" width="300">


## Features

- Start and pause cleaning
- Start and pause spot cleaning
- Return to dock
- Toggle schedule
- Toggle eco mode
- Toggle nogo lines
- Toggle 4x4 mode (spot)
- Toggle repeat mode (spot)
- Get battery info
- Get dock info
- Periodic refresh of robot state
- Support for multiple robots
<!-- - Toggle extra care navigation -->

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-vorwerk`
3. Update your configuration file. See the sample below.

## Configuration

Add the following information to your config file. Change the values for email and password.

### Simple (Using the old username/password method, unsupported by MyKoboldApp)

```json
"platforms": [
	{
		"platform": "VorwerkVacuumRobot",
		"email": "YourEmail",
		"password": "YourPassword"
	}
]

```
### Simple (Supported by MyKoboldApp)

```json
"platforms": [
	{
		"platform": "VorwerkVacuumRobot",
		"token": "YourToken"
	}
]
```

You can get a token using the following two curl commands:

```bash
# This will trigger the email sending
curl -X "POST" "https://mykobold.eu.auth0.com/passwordless/start" \
     -H 'Content-Type: application/json' \
     -d $'{
  "send": "code",
  "email": "ENTER_YOUR_EMAIL_HERE",
  "client_id": "KY4YbVAvtgB7lp8vIbWQ7zLk3hssZlhR",
  "connection": "email"
}'
```
==== wait for the email to be received ====

```bash
# this will generate a token using the numbers you received via email
# replace the value of otp 123456 with the value you received from the email
curl -X "POST" "https://mykobold.eu.auth0.com/oauth/token" \
     -H 'Content-Type: application/json' \
     -d $'{
  "prompt": "login",
  "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
  "scope": "openid email profile read:current_user",
  "locale": "en",
  "otp": "123456",
  "source": "vorwerk_auth0",
  "platform": "ios",
  "audience": "https://mykobold.eu.auth0.com/userinfo",
  "username": "ENTER_YOUR_EMAIL_HERE",
  "client_id": "KY4YbVAvtgB7lp8vIbWQ7zLk3hssZlhR",
  "realm": "email",
  "country_code": "DE"
}'
```

From the output, you want to copy the `id_token` value.

<img src="https://raw.githubusercontent.com/nicoh88/homebridge-vorwerk/master/vorwerk-kobold-homekit-screenshot.png" style="border:1px solid lightgray" alt="Screenshot Vorwerk Kobold in Apple HomeKit" width="600">

### Advanced

The following config contains advanced optional settings.

The parameter **refresh** sets an interval in seconds that is used to update the robot state in the background. This is only required for automations based on the robot state. The default value is `auto` which means that the update is automatically enabled while cleaning and disabled while not cleaning. You can set a value in seconds e.g. `120` to enable background updates even when the robot is not cleaning. You can also disable background updates completely by setting the value `0`. This might be required if you experience timeouts in the app because you have other home automation apps that are connected to your robot.
The parameter **disabled** accepts a list of switches/sensors that can be disabled in the neato homekit plugin (e.g. dock, dockstate, eco, schedule, spot).

```json
"platforms": [
	{
		"platform": "VorwerkVacuumRobot",
		"token": "YourToken",
		"refresh": "120",
		"disabled": ["dock", "dockstate", "eco", "nogolines", "schedule", "spot"]
	}
]
```
<!-- "extraCareNavigation": true -->

## Tested robots

- Vorwerk Kobold VR200 (Firmware 2.1.3 & 2.1.4)
- Vorwerk Kobold VR300 (Firmware 4.2.4)

If you have another connected vorwerk robot, please [tell me](https://github.com/nicoh88/homebridge-vorwerk/issues) about your experience with this plugin.

## Changelog

### 0.1.0
* Initial release

### 0.1.1
* Release for npmjs

### 0.1.2
* Added config parameter to disable switches/sensors

### 0.2.0
* Fixed compatibility with homebridge 0.4.23 (occupancy sensor not working)
* Fixed a rare bug where the robot stops after some seconds of cleaning
* Added errorlog while refreshing robot state

### 0.3.0
* Add support for vorwerk kobold vr300
* Added noGo lines button
* Added extra care navigation button
* Added syncing cleaning options from last run
* Added option to disable background state update completely
* Changed goto dock button is now always off
* Changed error handling
* Changed debug messages
* Updated node-kobold dependency to 0.1.3
* Fixed an exception when no robot is associated with the account
<!-- * Removed extra care navigation option parameter (is now a button)-->

### 0.3.1
* Fixed cleaning with / without nogoLines

### 0.3.2
* Added support for spot cleaning with repeat (2x) and 4x4 mode [#3](https://github.com/nicoh88/homebridge-vorwerk/issues/3)
  * repeat and 4x4 mode are not persistent, after a reboot of homebridge set it to off/false - use it for spot cleaning in compination with homekit scenes or automations

### 0.4.0
* Add oauth mechanism to support the MyKobold app
