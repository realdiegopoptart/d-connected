"use strict";

var MySQL = null;
var mysql_user = "root";
var mysql_password = "";
var mysql_host = "localhost";
var mysql_database = "database";
var mysql_port = 3306;

bindEventHandler("OnResourceStart", thisResource, (event,resource) => {
	if(resource != thisResource) return false;

	MySQL = module.mysql.connect(mysql_host, mysql_user, mysql_password, mysql_database,mysql_port);

	if(MySQL.error) {
		//  Database connection failed connecting
		console.error("[d-login] MySQL Error: "+MySQL.error+" ("+MySQL.errorNum+")");
		return false;
	} else {
		setInterval(() => {
		
			if(!MySQL.ping) {
				console.error("[d-login] MySQL Error: "+MySQL.error+" ("+MySQL.errorNum+")");
				console.error("[d-login] Trying to reconnect to the MySQL database...");
	
				if(!this.MySQLconnect()) {
					console.error("[d-login] Failed to reconnect to database. Shutting down server...");
					consoleCommand("quit");
				}
				return;
			}

		}, 15000);
		console.log("[d-login] MySQL connection established.");
		return true;
	}

});

addEventHandler("OnPlayerJoined", (event,client) => {
	resetPlayer(client);
	loadPlayer(client);
    fadeCamera(client, true);
});

addEventHandler("onResourceStop", (event,resource,stoppingForRestart) => {
	MySQL.close();
});

function loadPlayer(client)
{
	let result = MySQL.query(`SELECT * FROM players WHERE username = '${MySQL.escapeString(client.name)}' LIMIT 1`).fetchAssoc();

	if(result) {
		// Player is registered
		messageClient("This account is registered. Please login with /login", client, toColour(255, 255, 255));
		client.setData("registered", true);

	}
	else {
		// Player is not registered
		messageClient("You are not registered. Please register with /register", client, toColour(255, 255, 255));
		client.setData("registered", false);
	}

	if(server.game == GAME_GTA_III) {
		spawnPlayer(client, [-362.94, 239.359, 60.654], 0, 2);
	}
	else if(server.game == GAME_GTA_VC) {
		spawnPlayer(client, [-592.0, 670.0, 11.0], 0, 2);
	}
	else if (server.game == GAME_GTA_SA) {
		spawnPlayer(client, [-711, 957, 12.4], 90/180*Math.PI, 182);
	}
	else if (server.game == GAME_GTA_IV) {
		spawnPlayer(client, [-1000, 1000, 0], 0, 1487004273);
	}
}

function resetPlayer(client) {
	client.setData("username", null);
	client.setData("dbid", null);
	client.setData("registeredTimestamp", null);
	
	
	client.setData("loggedin", false);
	client.setData("registered", false);
}

addEventHandler('OnPlayerCommand', (event, client, command, parameters) => {
    // if the player who isn't logged in tries to use a command other than /register or /login
	if(client.getData("loggedin") == false && command != "register" && command != "login") {
		messageClient("You must be logged in to use this command.", client, toColour(255, 255, 255));
		return false;
	}

	if(command == "register") {
		if(client.getData("registered") == true) {
			messageClient("You are already registered. Please login with /login", client, toColour(255, 255, 255));
			return true;
		}

		if(parameters.length == 0) {
			messageClient("Correct usage: /register [password]", client, toColour(255, 255, 255));
			return true;
		}

		if(parameters.length < 3) {
			messageClient("Password must be at least 3 characters long.", client, toColour(255, 255, 255));
			return true;
		}

		let result = MySQL.query(`SELECT * FROM players WHERE username = '${MySQL.escapeString(client.name)}' LIMIT 1`).fetchAssoc();

		// good to check again, just in case.
		if(!result) {
			// Player is not registered
			let hashPw = module.hashing.sha512(parameters); // hash the password
			MySQL.query(`INSERT INTO players (username, password, registeredTimestamp) VALUES ('${MySQL.escapeString(client.name)}', '${hashPw}', ${Math.floor(Date.now() / 1000)})`);
			messageClient("You have successfully registered. Please login with /login", client, toColour(255, 255, 255));
			client.setData("registered", true);
		}
		else {
			// Player is registered
			messageClient("This account is already registered. Please login with /login", client, toColour(255, 255, 255));
		}
	}

	if(command == "login") {
		if(client.getData("loggedin") == true) {
			messageClient("You are already logged in.", client, toColour(255, 255, 255));
			return true;
		}

		if(client.getData("registered") == false) {
			messageClient("You must be registered to login. Please register with /register", client, toColour(255, 255, 255));
			return true;
		}

		if(parameters.length == 0) {
			messageClient("Correct usage: /login [password]", client, toColour(255, 255, 255));
			return true;
		}

		if(parameters.length < 3) {
			messageClient("Password must be at least 3 characters long.", client, toColour(255, 255, 255));
			return true;
		}

		let hashPw = module.hashing.sha512(parameters); // hash the password
		let result = MySQL.query(`SELECT * FROM players WHERE username = '${MySQL.escapeString(client.name)}' AND password = '${hashPw}' LIMIT 1`).fetchAssoc();

		if(!result) {
			// Player is not registered
			messageClient("Invalid username or password.", client, toColour(255, 255, 255));
			return;
		}
		else {
			// Player is registered
			messageClient("You have successfully logged in.", client, toColour(255, 255, 255));
			
			client.setData("loggedin", true);
			client.setData("username", result["username"]);
			client.setData("dbid", result["playerId"]);
			client.setData("registeredTimestamp", result["registeredTimestamp"]);
			
			messageClient("You registered this account on timestamp: " + client.getData("registeredTimestamp"), client, toColour(255, 255, 255));
		}
	}
});

addEventHandler("onPlayerQuit", (event, client, disconnectType) => {
	// update disconnectReason
	if(client.getData("loggedin")) {
		MySQL.query(`UPDATE players SET lastSeen = ${Math.floor(Date.now() / 1000)} WHERE playerid = ${client.getData("dbid")}`);
		MySQL.query(`UPDATE players SET disconnectReason = ${disconnectType} WHERE playerId = ${client.getData("dbid")}`);
	}
	resetPlayer(client);
});

addEventHandler("onPlayerChat", (event, client, string) => {
	event.preventDefault(); // prevent defaut chat message from being sent
	

	if(client.getData("loggedin") == false) {
		return messageClient("You must be logged in to chat.", client, toColour(255, 255, 255));
	}

	message(`${client.name}: ${string}`, toColour(255, 255, 255));
	return true;
});
