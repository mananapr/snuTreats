
var express = require("express");
var app = express();
var mysql = require('mysql')
var bcrypt = require('bcrypt')
var bodyParser = require("body-parser");


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'snuTreats'
});

var saltRounds = 5;

app.use(bodyParser.json())


connection.connect()

//shops 
app.get("/shops",function(req,res){
			connection.query('SELECT * FROM `shops` ', function (error, results, fields) {
						// var tmp = JSON.stringify(results);
						// console.log(JSON.parse(tmp));
		 				res.json(JSON.stringify(results));
			});

		//	res.send("King Kushagr")
});


//inside indvidual shop
app.get("/shops/:id",function(req,res){
	var id = req.params.id;
	//console.log(id);
	connection.query('SELECT * FROM `menuItems` WHERE shop_id =?',[id],function(error,results,fields) {
		console.log(results);
		res.json(JSON.stringify(results));
	})
});


//individual item details
app.get("/shops/:sid/item/:id",function(req,res){
	var sid = req.params.sid;
	var id = req.params.id;

	connection.query('SELECT * FROM `menuItems` WHERE shop_id =? AND id =?',[sid,id],function(error,results,fields) {
		console.log(results);
		res.json(JSON.stringify(results));
	})

})


//login route
app.post("/login",function(req,res){
		
		
		var uname = req.body.username;
		var passd = req.body.password;
		var flag = 0;
		//console.log(req.body);
			connection.query('SELECT * FROM `users`',function(error,results,fields){
				if(results.length > 0){
					results.forEach(function(tmp){
				
					//console.log(tmp,passd);
					bcrypt.compare(passd, tmp.password,function(err,result){
						if(result==true && flag==0)
						{
							flag = 1;
							res.json(JSON.stringify(tmp));
						}
					});
				});
				} 
				else {
				res.send("No match found");

				}

			});
			//res.send("No match found");
	});


//register route
app.post("/register",function(req,res){
		
		
		var uname = req.body.username;
		var passd = req.body.password;

		bcrypt.hash(passd,saltRounds,function(err,hash){
			if(err)
				console.log(err);
			var columns = ['username','password'];
			var values = []
			console.log(hash);
			values.push(uname);
			values.push(passd);
			connection.query('INSERT INTO `users` (`username`,`password`) VALUES ("'+uname+'", "'+hash+'")',function (error, results, fields) {
					if(error)
						console.log(error)
					res.send("registered");
			});
		});
	});





app.listen(3000,function(){
	console.log("Server started");
});