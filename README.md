# homebridge-vorwerk

This is a plugin for [homebridge](https://github.com/nfarina/homebridge) to control your [Vorwerk Kobold](https://kobold.vorwerk.de/saugroboter/) vacuum robot. You can download it via [npm](https://www.npmjs.com/package/homebridge-vorwerk).

Based on naofireblade's [homebridge-neato](https://github.com/naofireblade/homebridge-neato).

Feel free to leave any feedback [here](https://github.com/nicoh88/homebridge-vorwerk/issues).


## Features

- Start and pause cleaning
- Return to dock\*
- Enable and disable schedule
- Enable and disable eco mode
- Get battery info
- Get dock info
- Periodic refresh of robot state
- Support for multiple robots

<!-- - Extra care navigation -->
\* Available after some seconds of cleaning.

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-vorwerk`
3. Update your configuration file. See the sample below.

## Configuration

Add the following information to your config file. Change the values for email and password.

### Simple

```json
"platforms": [
	{
		"platform": "VorwerkVacuumRobot",
		"email": "YourEmail",
		"password": "YourPassword"
	}
]
```

### Advanced

The following config contains advanced optional settings that are off when not specified.

The parameter **refresh** sets in what interval (seconds) changes of the robot state will be pushed to homekit. The minimum refresh time is 60 seconds. You need this only when you set up rules based on the robot state and start him outside of homekit (e.g. with the Vorwerk app).

The parameter **disabled** accepts a list of switches/sensors that can be disabled in the neato homekit plugin (e.g. dock, dockstate, eco, schedule).

<!-- The parameter **extraCareNavigation** determines if supporting models (currently Neato D3 and D5) should take extra care of your furniture while cleaning. -->

```json
"platforms": [
	{
		"platform": "VorwerkVacuumRobot",
		"email": "YourEmail",
		"password": "YourPassword",
		"refresh": "120",
		"disabled": ["dock", "eco"]
	}
]
```
<!-- "extraCareNavigation": true -->

## Tested robots

- Vorwerk Kobold VR200 (Firmware 2.1.3)

If you have another connected vorwerk robot, please [tell me](https://github.com/nicoh88/homebridge-vorwerk/issues) about your experience with this plugin.

## Changelog

### 0.1.0
* (nicoh88) initial release

### 0.1.1
* (nicoh88) release for npmjs

### 0.1.2
* (nicoh88) added config parameter to disable switches/sensors
