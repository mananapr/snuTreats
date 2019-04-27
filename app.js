var express = require("express");
var app = express();
//var mysql = require('mysql')
var bcrypt = require('bcrypt')
var bodyParser = require("body-parser");
var Insta = require('instamojo-nodejs');

//Connecting to postgreSQL database
var pg = require('pg');
var connectionString = "postgres://postgres:1010@localhost:5432/snuTreats";
var client = new pg.Client(connectionString);
client.connect();

/*
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'snuTreats'
});*/




var saltRounds = 5;

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:true}));


//connection.connect()



//------------------------------------------------------USER ROUTES----------------------------------------------------------------

//Return all the shops
app.get("/shops",function(req,res){
			client.query('SELECT * FROM vendors ', function (error, results, fields) {
				if(error){
					console.log(error);
					res.status(500).send({message: error});
				}else{
					console.log(results);
					res.status(200).send(results['rows']);
				}
			});

		//	res.send("King Kushagr")
});


//Return the menu of particular shop
app.get("/shops/:id",function(req,res){
	var id = req.params.id;
	client.query('SELECT * FROM menu_items WHERE shop_id =$1',[id],function(error,results,fields) {
		if(error){
			console.log(error);
			res.status(500).send({message: error});
		}else{
			res.status(200).send(results['rows']);
		}
	})
});


//individual item details
app.get("/shops/item/:id",function(req,res){
	var id = req.params.id;

	client.query('SELECT * FROM menu_items WHERE id =$1',[id],function(error,results,fields) {
		if(error){
			console.log(results);
			res.status(500).send({message: error});
		}else{
			res.status(200).send(results['rows']);
		}
	});

});


//login route
app.post("/login",function(req,res){
		
		var uname = req.body.username;
		var passd = req.body.password;
		var type = req.body.user_type;
		
		if(type==='user'){
			client.query(`SELECT * FROM users WHERE username = $1`, [uname], function (error, results) {
				if (error){
					res.status(500).send({message: error});
				}
				if (results['rows'].length === 0) {
					res.status(400).send({message: "details incorrect"});
				}else{
					bcrypt.compare(passd, results['rows'][0]['password'])
					.then(boolean => {
						if(!boolean){
							res.status(400).send({message: "details incorrect"})
						}else{
							res.status(200).send({user: results['rows'][0]['username']});
						}		
					}).catch(error => {
						console.log(error);
					});
				}				
			});		
		}else if(type=='vendor'){
			client.query(`SELECT * FROM vendors WHERE vendor_uname = $1`, [uname], function (error, results) {
				if (error){
					res.status(500).send({message: error});
				}
				
				if (results['rows'].length === 0) {
					res.status(400).send({message: "details incorrect"});
				}else{
					bcrypt.compare(passd, results['rows'][0]['password'])
						.then(boolean => {
							if(!boolean){
								res.status(400).send({message: "details incorrect"})
							}else{
								res.status(200).send({user: results['rows'][0]['vendor_uname']});
							}
						}).catch(error => {res.status(400).send({message: error})});	
				}
			});		

		}else if(type==='admin'){
			//YET TO BE IMPLEMENTED
		}

});


//register route
app.post("/register",function(req,res){
		
		
		var uname = req.body.username;
		var passd = req.body.password;
		//console.log(req.body);
		bcrypt.hash(passd,saltRounds,function(err,hash){
			if(err){
				console.log(err);
				res.status(400).send({message: `Couldn't hash the password`});
			}
			client.query('INSERT INTO users(username, password) VALUES ($1, $2)',[uname, hash],function (error, results, fields) {
				if(error){
					console.log(error);
					res.status(500).send({message: error});
				}else{
					res.status(200).send({message: "User registered successfully"});
				}
			});
		});
});


//Place a new order
app.post("/order", function(req, res){

	//Order in form of a JSON array
	var order = req.body;
	console.log(order);
	//Generate a unique order id
	var newOrderId;
	var noOfRows=0;

    // Run the Algorithm
    var exec = require('child_process').exec;
    exec('python algo.py', function callback(error, stdout, stderr){
    });

	//Retrieve the previous order id
	client.query('select max(order_id) from orders', function(error, results){
		if(error){
			console.log(error);
			res.status(500).send(error);
		}else{
			if(results['rows'][0]['max']===null){
				newOrderId = '1';
			}else{
				var currOrderId = results['rows'][0]['max'];
				console.log('Max ID: ' + currOrderId);
				newOrderId = Number(currOrderId)+1;
				console.log('New Order ID: ' + newOrderId);		
			}

			//Insert a row for each item in the order
			for(var i=0; i<order.length; i++){
				var currObj = order[i];
				var username = currObj['username'];
				var itemId = currObj['item_id'];
				var quantity = currObj['quantity'];
				var timestamp = new Date();
				var status = 'NOT PREPARED';
				var vendorUsername = currObj['vendor_uname'];
				client.query('insert into orders(order_id, username, item_id, quantity, timestamp, status, vendor_uname) values($1, $2, $3, $4, $5, $6, $7)', [newOrderId, username, itemId, quantity, timestamp, status, vendorUsername], function(error, result){
					if(error){
						console.log(error);
						res.status(500).send(error);
					}else{
						++noOfRows;
						if(noOfRows==(order.length)){
							res.status(200).send({message: 'Order successfully placed', orderId: newOrderId});
						}
					}
				});
			}
		}
	});

});

//Check whether an order is prepared or not
app.get('/order/check/:order_id', function(req, res){
	var orderId = req.params.order_id;
	client.query('select * from orders where order_id = $1 and status = $2', [orderId, 'NOT PREPARED'], function(error, result){
		if(error){
			console.log(error);
			res.status(500).send(error);
		}else{
			if(result['rows'].length===0){
				res.status(200).send({message: true});
			}else{
				res.status(200).send({message: false});
			}
		}
	});
});



//------------------------------------------------------VENDOR ROUTES----------------------------------------------------------------

//Add a new item to the shop
app.post('/shops/:id', function(req, res){
	var shopId = req.params.id;
	var name = req.body.name;
	var price = req.body.price;
	var prepTime = req.body.preparation_time;
	var bucketSize = req.body.bucket_size;
	client.query('insert into menu_items(shop_id, item_name, price, is_available, preparation_time, bucket_size) values($1, $2, $3, $4, $5, $6)',[shopId, name, price, true, prepTime, bucketSize], function(error, result){
		if(error){
			console.log(error);
			res.status(500).send({message: error});
		}else{
			res.status(200).send({message: "Menu Item added successfully"});
		}
	});	
});

//Update a menu item
app.put('/shops/item/:id', function(req, res){
	var id = req.params.id;
	var name = req.body.name;
	var price = req.body.price;
	var isAvailable = req.body.is_available;
	var prepTime = req.body.preparation_time;
	var bucketSize = req.body.bucket_size;

	client.query('update menu_items set item_name=$1, price=$2, is_available=$3, preparation_time=$5, bucket_size=$6 where id=$4',[name, price, isAvailable, id, prepTime, bucketSize], function(error, results){
		if(error){
			console.log(error);
			res.status(500).send({message: error});
		}else{
			res.status(200).send({message: "Item details updated successfully"});
		}
	});
});

//Get the current Order pool
app.get('/order/:vendor_uname', function(req, res){
	var vendorUsername = req.params.vendor_uname;
	client.query('select * from orders where vendor_uname = $1 and status = $2', [vendorUsername, 'NOT PREPARED'], function(error, results){
		if(error){
			console.log(error);
			res.status(500).send(error);
		}else{
			res.status(200).send({orders: results['rows']});
		}
	});
});

//Mark a particular order as updated
app.put('/order', function(req, res){
	var id = req.body.id;
	client.query('update orders set status = $1 where id = $2',['PREPARED', id], function(error, result){
		if(error){
			console.log(error);
			res.status(500).send(error);
		}else{
			res.status(200).send({message: "Order marked as prepared"});
		}
	});
});

//------------------------------------------------------ADMIN ROUTES----------------------------------------------------------------

//Add new vendor/shop
app.post('/shops', function(req, res){
	var vendorUsername = req.body.username;
	var password = req.body.password;
	var name = req.body.name;

	bcrypt.hash(password, saltRounds, function(err, hash){
		if(err){
			console.log(err);
			res.status(400).send({message: `Couldn't hash the password`});
		}
		client.query('insert into vendors(name, vendor_uname, password, is_open) values($1, $2, $3, false)',[name, vendorUsername, hash], function(error, result){
			if(error){
				console.log(error);
				res.status(500).send({message: error});
			}else{
				res.status(200).send({message: "User registered successfully"});
			}
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
    //connection.query('INSERT INTO `payments` (`paymentID`,`status`, `requestID`) VALUES ("'+paymentID+'", "'+paymentStatus+'", "'+requestID+'")',function (error, results, fields) {
    //        if(error)
    //            console.log(error)
    //        res.send("success");
    //});

});


//Start the application on port 3000
app.listen(3000,function(){
	console.log("Server started on port 3000");
});
