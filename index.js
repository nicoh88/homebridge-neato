"use strict";
var inherits = require('util').inherits,
	debug = require('debug')('homebridge-vorwerk'),
	kobold = require('node-kobold-oauth'),

	Service,
	Characteristic

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform("homebridge-vorwerk", "VorwerkVacuumRobot", VorwerkVacuumRobotPlatform);
}

function VorwerkVacuumRobotPlatform(log, config) {
	this.log = log;
	this.serial = "1-3-3-7";
	this.email = config['email'];
	this.password = config['password'];
	this.token = config['token'];
	this.hiddenServices = ('disabled' in config ? config['disabled'] : '');

	// this.careNavigation = ('extraCareNavigation' in config && config['extraCareNavigation'] ? 2 : 1);
	// debug("Extra Care Navigation: " + this.careNavigation);

	if ('refresh' in config && config['refresh'] !== 'auto') {
 		// parse config parameter
 		this.refresh = parseInt(config['refresh']);
 		// must be integer and positive
 		this.refresh = (typeof this.refresh !== 'number' || (this.refresh % 1) !== 0 || this.refresh < 0) ? 60 : this.refresh;
 		// minimum 60s to save some load on the neato servers
 		this.refresh = (this.refresh > 0 && this.refresh < 60) ? 60 : this.refresh;
 	}
 	// default auto
 	else {
 		this.refresh = 'auto';
 	}
 	debug("Refresh is set to: " + this.refresh);
}

VorwerkVacuumRobotPlatform.prototype = {
	accessories: function (callback) {
		this.accessories = [];

		let that = this;
		this.robots = this.getRobots(function () {
			for (var i = 0; i < that.robots.length; i++) {
				that.log("getRobots | Found robot #" + (i + 1) + " named \"" + that.robots[i].name + "\" with serial \"" + that.robots[i]._serial + "\"");
				var robotAccessory = new VorwerkVacuumRobotAccessory(that.robots[i], that);
				that.accessories.push(robotAccessory);
			}
			callback(that.accessories);
		});
	},

	getRobots: function (callback) {
 		debug("getRobots | Loading your robots");
		let client = new kobold.Client();
		let that = this;
		let loginCallback = function (error) {
			if (error) {
				that.log(error);
				that.log.error("getRobots | Can't log on to vorwerk cloud. Please check your credentials.");
				callback();
			}
			else {
				client.getRobots(function (error, robots) {
					if (error) {
						that.log(error);
						that.log.error("getRobots | Successful login but can't connect to your vorwerk robot.");
						callback();
					}
					else {
						if (robots.length === 0) {
							that.log.error("getRobots | Successful login but no robots associated with your account.");
							that.robots = [];
							callback();
						}
						else {
							debug("getRobots | Found " + robots.length + " robots");
							that.robots = robots;
							callback();
						}
					}
				});
			}
		}

		// use the new oauth2 mechanism
		if (this.token) {
			client.setToken(this.token);
			loginCallback();
		} else {
			client.authorize(this.email, this.password, false, loginCallback);
		}
	}
}

function VorwerkVacuumRobotAccessory(robot, platform) {
	this.platform = platform;
	this.log = platform.log;
	this.refresh = platform.refresh;
	this.hiddenServices = platform.hiddenServices;
	this.robot = robot;
	this.name = robot.name;
	this.lastUpdate = null;

	this.tempSpot4x4 = false;
	this.tempSpotRepeat = false;

	this.vacuumRobotCleanService = new Service.Switch(this.name + " Clean", "clean");
	this.vacuumRobotSpotCleanService = new Service.Switch(this.name + " SpotClean", "spotClean");
	this.vacuumRobotSpotRepeatService = new Service.Switch(this.name + " SpotClean Extra Care", "spotExtraCare");
	this.vacuumRobotSpot4x4Service = new Service.Switch(this.name + " SpotClean 4x4", "spotClean4x4");
	this.vacuumRobotGoToDockService = new Service.Switch(this.name + " Go to Dock", "goToDock");
	this.vacuumRobotDockStateService = new Service.OccupancySensor(this.name + " Dock", "dockState");
	this.vacuumRobotEcoService = new Service.Switch(this.name + " Eco Mode", "eco");
	this.vacuumRobotNoGoLinesService = new Service.Switch(this.name + " NoGo Lines", "noGoLines");
 	//this.vacuumRobotExtraCareService = new Service.Switch(this.name + " Extra Care", "extraCare");
	this.vacuumRobotScheduleService = new Service.Switch(this.name + " Schedule", "schedule");
	this.vacuumRobotBatteryService = new Service.BatteryService("Battery", "battery");

	this.updateRobotTimer();
}


VorwerkVacuumRobotAccessory.prototype = {
	identify: function (callback) {
		let that = this;
		this.updateRobot(function () {
			// hide serial and secret in log
			let _serial = that.robot._serial;
			let _secret = that.robot._secret;
			that.robot._serial = "*****";
			that.robot._secret = "*****";
			that.log(that.robot);
			that.robot._serial = _serial;
			that.robot._secret = _secret;
			callback();
		});
	},

	getServices: function () {
		debug(this.robot._serial);
		this.informationService = new Service.AccessoryInformation();
		this.informationService
		.setCharacteristic(Characteristic.Name, this.robot.name)
		.setCharacteristic(Characteristic.Manufacturer, "Vorwerk Deutschland Stiftung & Co. KG")
		.setCharacteristic(Characteristic.Model, "Coming soon")
		.setCharacteristic(Characteristic.SerialNumber, this.robot._serial);

		this.vacuumRobotCleanService.getCharacteristic(Characteristic.On).on('set', this.setClean.bind(this));
		this.vacuumRobotCleanService.getCharacteristic(Characteristic.On).on('get', this.getClean.bind(this));

		this.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).on('set', this.setGoToDock.bind(this));
		this.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).on('get', this.getGoToDock.bind(this));

		this.vacuumRobotDockStateService.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getDock.bind(this));

		this.vacuumRobotEcoService.getCharacteristic(Characteristic.On).on('set', this.setEco.bind(this));
		this.vacuumRobotEcoService.getCharacteristic(Characteristic.On).on('get', this.getEco.bind(this));

		this.vacuumRobotNoGoLinesService.getCharacteristic(Characteristic.On).on('set', this.setNoGoLines.bind(this));
 		this.vacuumRobotNoGoLinesService.getCharacteristic(Characteristic.On).on('get', this.getNoGoLines.bind(this));

 		//this.vacuumRobotExtraCareService.getCharacteristic(Characteristic.On).on('set', this.setExtraCare.bind(this));
 		//this.vacuumRobotExtraCareService.getCharacteristic(Characteristic.On).on('get', this.getExtraCare.bind(this));

		this.vacuumRobotScheduleService.getCharacteristic(Characteristic.On).on('set', this.setSchedule.bind(this));
		this.vacuumRobotScheduleService.getCharacteristic(Characteristic.On).on('get', this.getSchedule.bind(this));

		this.vacuumRobotBatteryService.getCharacteristic(Characteristic.BatteryLevel).on('get', this.getBatteryLevel.bind(this));
		this.vacuumRobotBatteryService.getCharacteristic(Characteristic.ChargingState).on('get', this.getBatteryChargingState.bind(this));

		this.vacuumRobotSpotCleanService.getCharacteristic(Characteristic.On).on('set', this.setSpotClean.bind(this));
		this.vacuumRobotSpotCleanService.getCharacteristic(Characteristic.On).on('get', this.getSpotClean.bind(this));

		this.vacuumRobotSpot4x4Service.getCharacteristic(Characteristic.On).on('set', this.setSpot4x4.bind(this));
		this.vacuumRobotSpot4x4Service.getCharacteristic(Characteristic.On).on('get', this.getSpot4x4.bind(this));

		this.vacuumRobotSpotRepeatService.getCharacteristic(Characteristic.On).on('set', this.setSpotRepeat.bind(this));
		this.vacuumRobotSpotRepeatService.getCharacteristic(Characteristic.On).on('get', this.getSpotRepeat.bind(this));


		this.services = [this.informationService, this.vacuumRobotCleanService, this.vacuumRobotBatteryService];
		if (this.hiddenServices.indexOf('dock') === -1)
 			this.services.push(this.vacuumRobotGoToDockService);
 		if (this.hiddenServices.indexOf('dockstate') === -1)
 			this.services.push(this.vacuumRobotDockStateService);
 		if (this.hiddenServices.indexOf('eco') === -1)
 			this.services.push(this.vacuumRobotEcoService);
		if (this.hiddenServices.indexOf('nogolines') === -1)
 			this.services.push(this.vacuumRobotNoGoLinesService);
 		//if (this.hiddenServices.indexOf('extracare') === -1)
 		//	this.services.push(this.vacuumRobotExtraCareService);
 		if (this.hiddenServices.indexOf('schedule') === -1)
 			this.services.push(this.vacuumRobotScheduleService);
 		if (this.hiddenServices.indexOf('spot') === -1) {
 			this.services.push(this.vacuumRobotSpotCleanService);
 			this.services.push(this.vacuumRobotSpot4x4Service);
 			this.services.push(this.vacuumRobotSpotRepeatService);
 		};
 		return this.services;
	},

	setClean: function (on, callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			if (on) {
				if (that.robot.canResume || that.robot.canStart) {

					// start extra update robot timer if refresh is set to "auto"
 					if (that.refresh === 'auto') {
 						setTimeout(function () {
 							clearTimeout(that.timer);
 							that.updateRobotTimer();
 						}, 60 * 1000);
 					}

					if (that.robot.canResume) {
						debug("setClean | " + that.name + ": Resume cleaning");
						that.robot.resumeCleaning(callback);
					}
					else {
						let eco = that.vacuumRobotEcoService.getCharacteristic(Characteristic.On).value;
 						//let extraCare = that.vacuumRobotExtraCareService.getCharacteristic(Characteristic.On).value;
 						let extraCare = false;
 						let nogoLines = that.vacuumRobotNoGoLinesService.getCharacteristic(Characteristic.On).value;
 						debug("setClean | " + that.name + ": Start cleaning (eco: " + eco + ", extraCare: " + extraCare + ", nogoLines: " + nogoLines + ")");
 						that.robot.startCleaning(
 							eco,
 							extraCare ? 2 : 1,
 							nogoLines,
 							function (error, result) {
 								if (error) {
 									that.log.error(error + ": " + result);
 									callback(true);
 								}
 								else {
 									callback();
 								}
 							});
					}
				}
				else {
					debug("setClean | " + that.name + ": Cant start, maybe already cleaning");
					callback();
				}
			}
			else {
				if (that.robot.canPause) {
					debug("setClean | " + that.name + ": Pause cleaning");
					that.robot.pauseCleaning(callback);
				}
				else {
					debug("setClean | " + that.name + ": Already stopped");
					callback();
				}
			}
		});
	},

	setSpotClean: function (on, callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			if (on) {
				if (that.robot.canResume || that.robot.canStart) {

					// start extra update robot timer if refresh is set to "auto"
 					if (that.refresh === 'auto') {
 						setTimeout(function () {
 							clearTimeout(that.timer);
 							that.updateRobotTimer();
 						}, 60 * 1000);
 					}

					if (that.robot.canResume) {
						debug("setSpotClean | " + that.name + ": Resume spot cleaning");
						that.robot.resumeCleaning(callback);
					}
					else {
						let eco = that.vacuumRobotEcoService.getCharacteristic(Characteristic.On).value;
						if (!that.vacuumRobotSpot4x4Service.getCharacteristic(Characteristic.On).value) {
							var width = 200;
 							var height = 200;
 						} else {
 							var width = 400;
 							var height = 400;
 						} 
 						let repeat = that.vacuumRobotSpotRepeatService.getCharacteristic(Characteristic.On).value;
 						let extraCare = false;
 						debug("setSpotClean | " + that.name + ": Start spot cleaning (eco: " + eco + ", width: " + width + ", height: " + height + ", repeat: " + repeat + ")");
 						that.robot.startSpotCleaning(
 							eco,
 							width,
 							height,
 							repeat ? 2 : 1,
 							extraCare ? 2 : 1,
 							function (error, result) {
 								if (error) {
 									that.log.error(error + ": " + result);
 									callback(true);
 								}
 								else {
 									callback();
 								}
 							});
					}
				}
				else {
					debug("setSpotClean | " + that.name + ": Cant start, maybe already cleaning");
					callback();
				}
			}
			else {
				if (that.robot.canPause) {
					debug("setSpotClean | " + that.name + ": Pause spot cleaning");
					that.robot.pauseCleaning(callback);
				}
				else {
					debug("setSpotClean | " + that.name + ": Already stopped");
					callback();
				}
			}
		});
	},

	setGoToDock: function (on, callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			if (on) {
				if (that.robot.canPause) {
					debug("setGoToDock | " + that.name + ": Pause cleaning to go to dock");
					that.robot.pauseCleaning(function (error, result) {
						setTimeout(function () {
							debug("Go to dock");
						    	that.robot.sendToBase(callback);
						}, 1000);
					});
				}
				else if (that.robot.canGoToBase) {
					debug("setGoToDock | " + that.name + ": Go to dock");
					that.robot.sendToBase(callback);
				}
				else {
					that.log.warn("setGoToDock | " + that.name + ": Can't go to dock at the moment");
					callback();
				}
			} else {
				callback();
			}
		});
	},

	setEco: function (on, callback) {
		debug("setEco | " + this.name + ": " + (on ? "Enable eco mode" : "Disable eco mode"));
		this.robot.eco = on;
		callback();
	},

	setNoGoLines: function (on, callback) {
 		debug("setEco | " + this.name + ": " + (on ? "Enable nogo lines" : "Disable nogo lines"));
 		this.robot.noGoLines = on;
 		callback();
 	},

 	//setExtraCare: function (on, callback) {
 	//	debug(this.name + ": " + (on ? "Enable extra care navigation" : "Disable extra care navigation"));
 	//	this.robot.navigationMode = on ? 2 : 1;
 	//	callback();
 	//},

	setSchedule: function (on, callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			if (on) {
				debug("setSchedule | " + that.name + ": Enable schedule");
				that.robot.enableSchedule(callback);
			}
			else {
				debug("setSchedule | " + that.name + ": Disable schedule");
				that.robot.disableSchedule(callback);
			}
		});
	},

	setSpotRepeat: function (on, callback) {
		debug("setSpotRepeat | " + this.name + ": " + (on ? "Enable spot cleaning repeat mode (2x)" : "Disable spot cleaning repeat mode (2x)"));
		if (on) {
			this.tempSpotRepeat = true;
		}
		else {
			this.tempSpotRepeat = false;
		}
		callback();
	},

	setSpot4x4: function (on, callback) {
		debug("setSpot4x4 | " + this.name + ": " + (on ? "Enable spot cleaning 4x4 mode" : "Disable spot cleaning 4x4 mode"));
		if (on) {
			this.tempSpot4x4 = true;
		}
		else {
			this.tempSpot4x4 = false;
		}
		callback();
	},

	getClean: function (callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			debug("getClean | " + that.name + ": Is cleaning: " + that.robot.canPause);
			callback(false, that.robot.canPause);
		});
	},

	getSpotClean: function (callback) {
		let that = this;
		this.updateRobot(function (error, result) {
			debug("getSpotClean | " + that.name + ": Is cleaning: " + that.robot.canPause);
			callback(false, that.robot.canPause);
		});
	},

	getGoToDock: function (callback) {
 		callback(false, false);
 	},

	getDock: function (callback) {
		let that = this;
		this.updateRobot(function () {
			debug("getDock | " + that.name + ": Is docked: " + that.robot.isDocked);
			callback(false, that.robot.isDocked ? 1 : 0);
		});
	},

	getEco: function (callback) {
 		let that = this;
 		this.updateRobot(function () {
 			debug("getEco | " + that.name + ": Is eco: " + that.robot.eco);
 			callback(false, that.robot.eco);
 		});
 	},

	getNoGoLines: function(callback) {
		let that = this;
		this.updateRobot(function () {
 			debug("getNoGoLines | " + that.name + ": Is nogo lines: " + that.robot.noGoLines);
 			callback(false, that.robot.noGoLines ? 1 : 0);
 		});
 	},

 	//getExtraCare: function (callback) {
 	//	let that = this;
 	//	this.updateRobot(function () {
 	//		debug("getExtraCare | " + that.name + ": Is extra care navigation: " + (that.robot.navigationMode == 2 ? true : false));
 	//		callback(false, that.robot.navigationMode == 2 ? 1 : 0);
 	//	});
 	//},

 	getSchedule: function (callback) {
 		let that = this;
 		this.updateRobot(function () {
 			debug("getSchedule | " + that.name + ": Is schedule: " + that.robot.isScheduleEnabled);
			callback(false, that.robot.isScheduleEnabled);
		});
	},

 	getSpotRepeat: function (callback) {
 		let that = this;
			debug("getSpotRepeat | " + that.name + ": Is spot cleaning repeat: " + that.tempSpotRepeat);
			callback(false, that.tempSpotRepeat);
	},

 	getSpot4x4: function (callback) {
 		let that = this;
 			debug("getSpot4x4 | " + that.name + ": Is spot cleaning 4x4: " + that.tempSpot4x4);
			callback(false, that.tempSpot4x4);
	},

	getBatteryLevel: function (callback) {
		let that = this;
		this.updateRobot(function () {
			debug("getBatteryLevel | " + that.name + ": Battery: " + that.robot.charge + "%");
			callback(false, that.robot.charge);
		});
	},

	getBatteryChargingState: function (callback) {
		let that = this;
		this.updateRobot(function () {
			debug("getBatteryChargingState | " + that.name + ": Is charging: " + that.robot.isCharging);
			callback(false, that.robot.isCharging);
		});
	},

	updateRobot: function (callback) {
		let that = this;
		if (this.lastUpdate !== null && new Date() - this.lastUpdate < 2000) {
			callback();
		}
		else {
			debug("updateRobot | " + this.name + ": Updating robot state");
			this.robot.getState(function (error, result) {
				if (error) {
					that.log.error(error + ": " + result);
				}
				that.lastUpdate = new Date();
				callback();
			});
		}
	},

	updateRobotTimer: function () {
		let that = this;
		this.updateRobot(function (error, result) {

			// only update these values if the state is different from the current one, otherwise we might accidentally start an action
			if (that.vacuumRobotCleanService.getCharacteristic(Characteristic.On).value !== that.robot.canPause) {
				that.vacuumRobotCleanService.setCharacteristic(Characteristic.On, that.robot.canPause);
			}
			if (that.vacuumRobotSpotCleanService.getCharacteristic(Characteristic.On).value !== that.robot.canPause) {
				that.vacuumRobotSpotCleanService.setCharacteristic(Characteristic.On, that.robot.canPause);
			}

			// dock switch is on (dock not seen before) and dock has just been seen -> turn switch off
			if (that.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).value == true && that.robot.dockHasBeenSeen) {
				that.vacuumRobotGoToDockService.setCharacteristic(Characteristic.On, false);
			}

			if (that.vacuumRobotScheduleService.getCharacteristic(Characteristic.On).value !== that.robot.isScheduleEnabled) {
				that.vacuumRobotScheduleService.setCharacteristic(Characteristic.On, that.robot.isScheduleEnabled);
			}

			// no commands here, values can be updated without problems
			that.vacuumRobotDockStateService.setCharacteristic(Characteristic.OccupancyDetected, that.robot.isDocked ? 1 : 0);
			that.vacuumRobotEcoService.setCharacteristic(Characteristic.On, that.robot.eco);
 			that.vacuumRobotNoGoLinesService.setCharacteristic(Characteristic.On, that.robot.noGoLines);
 			//that.vacuumRobotExtraCareService.setCharacteristic(Characteristic.On, that.robot.navigationMode == 2 ? true : false);
			that.vacuumRobotBatteryService.setCharacteristic(Characteristic.BatteryLevel, that.robot.charge);
			that.vacuumRobotBatteryService.setCharacteristic(Characteristic.ChargingState, that.robot.isCharging);

			// dont update eco, because we cant write that value onto the robot and dont want it to be overwritten in our plugin

			// robot is currently cleaning, update if refresh is set to auto or a specific interval
 			if (that.robot.canPause && that.refresh !== 0) {
 				let refreshTime = that.refresh === 'auto' ? 60 : that.refresh
 				debug("updateRobotTimer | Updating state in background every " + refreshTime + " seconds while cleaning");
 				that.timer = setTimeout(that.updateRobotTimer.bind(that), refreshTime * 1000);
			}
			// robot is not cleaning, but a specific refresh interval is set
 			else if (that.refresh !== 'auto' && that.refresh !== 0) {
				debug("updateRobotTimer | Updating state in background every " + that.refresh + " seconds (user setting)");
				that.timer = setTimeout(that.updateRobotTimer.bind(that), that.refresh * 1000);
			}
			else {
				debug("updateRobotTimer | Updating state in background disabled");
			}
		});
	},
}