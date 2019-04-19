var express = require("express");
var app = express();
var mysql = require('mysql')
var bcrypt = require('bcrypt')
var bodyParser = require("body-parser");
var Insta = require('instamojo-nodejs');


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'snuTreats'
});
connection.connect()

// for bcrypt
var saltRounds = 5;

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:true}));

Insta.setKeys('API_KEY', 'AUTH_KEY');
Insta.isSandboxMode(true);

//shops 
app.get("/shops",function(req,res){
			connection.query('SELECT * FROM `shops` ', function (error, results, fields) {
		 				res.json(JSON.stringify(results));
			});

		//	res.send("King Kushagr")
});


//inside indvidual shop
app.get("/shops/:id",function(req,res){
	var id = req.params.id;
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
	});

});


//login route
app.post("/login",function(req,res){
		
		var uname = req.body.username;
		var passd = req.body.password;
		//console.log(req.body);
		var flag = 0;
		      connection.query(`SELECT * FROM users WHERE username = ?`, [uname], function (error, results) {
	    if (error) throw error;

	    if (results.length === 0) {
	        return res.send({data: "details incorrect"})
	    }

	    bcrypt.compare(passd, results[0].password)
	        .then(boolean => {

	            if(!boolean){
	                return res.send({data: "details incorrect"})
	            }

	            res.send({data: {username: results[0].username}})
	        }).catch(error => {throw error});
	});
			//res.send("No match found");
});


//register route
app.post("/register",function(req,res){
		
		
		var uname = req.body.username;
		var passd = req.body.password;
		//console.log(req.body);
		bcrypt.hash(passd,saltRounds,function(err,hash){
			if(err)
				console.log(err);
			var columns = ['username','password'];
			var values = []
			values.push(uname);
			values.push(passd);
			connection.query('INSERT INTO `users` (`username`,`password`) VALUES ("'+uname+'", "'+hash+'")',function (error, results, fields) {
					if(error)
						console.log(error)
					res.send("registered");
			});
		});
	});


// This route returns the link to payment gateway
app.post("/getPaymentLink", function(req, res){

    var fname = req.body.firstname;
    var email  = req.body.email;
    var amount = req.body.amount;
    var productinfo = "food";

    var data = new Insta.PaymentData();
    data.purpose = productinfo;
    data.amount = amount;
    data.buyer_name = fname;
    data.email = email;
    data.setRedirectUrl('http://localhost:3000/insta');

    Insta.createPayment(data, function(error, response) {
      if (error) {
        // some error
        console.log(error);
      } else {
        // Payment redirection link at response.payment_request.longurl
        res.send(response);
      }
    });

});


// This route handles a successful transaction
app.get("/insta", function(req, res){

    var paymentID = req.query.payment_id;
    var requestID = req.query.payment_request_id;
    var paymentStatus = req.query.payment_status;
    connection.query('INSERT INTO `payments` (`paymentID`,`status`, `requestID`) VALUES ("'+paymentID+'", "'+paymentStatus+'", "'+requestID+'")',function (error, results, fields) {
            if(error)
                console.log(error)
            res.send("success");
    });

});


app.listen(3000,function(){
	console.log("Server started");
});
