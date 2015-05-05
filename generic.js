/***************************************************************************************************
 ***************************************************************************************************
 ****************************************  Generic Module  *****************************************
 ****************************************                  *****************************************
 ****************************************                  *****************************************
 ****************************************  -- services--   *****************************************
 ****************************************                  *****************************************
 ****************************************                  *****************************************
 ****************************************   .emailService  *****************************************
 ****************************************         |        *****************************************
 ****************************************         |        *****************************************
 ****************************************       .send()    *****************************************
 ****************************************       .bulk()    *****************************************
 ***************************************************************************************************
 ****************************************   .uploadService *****************************************
 ****************************************         |        *****************************************
 ****************************************         |        *****************************************
 ****************************************   .uploadLocal() *****************************************
 *************************************.uploadToExternalStorage()************************************
 ****************************************     .download()  *****************************************
 ****************************************                  *****************************************
 ****************************************                  *****************************************
 ***************************************************************************************************
 ****************************************                  *****************************************
 ****************************************      .token      *****************************************
 ****************************************         |        *****************************************
 ****************************************         |        *****************************************
 ****************************************   .generate()    *****************************************
 ****************************************                  *****************************************
 ***************************************************************************************************
 ***************************************************************************************************/ 

var nodemailer = require("nodemailer");
var fs = require('fs');
var uuid = require("node-uuid");
var dotenv = require('dotenv');
dotenv.load();

//SENDGRID
var sendgrid_username   = process.env.SENDGRID_USERNAME;
var sendgrid_password   = process.env.SENDGRID_PASSWORD;

var sendgrid   = require('sendgrid')(sendgrid_username, sendgrid_password);

//load properties for email 
var clientProperties = {};
clientProperties.protocol = process.env.PROTOCOL;
clientProperties.emailService = process.env.EMAIL_SERVICE;
clientProperties.emailUser = process.env.EMAIL_USER;
clientProperties.emailPass = process.env.EMAIL_PASS;
clientProperties.fromEmail = process.env.EMAIL_FROM;




/*
 * Generic service definition
 */
var generic = {


/***************************************************************************************************
 * Email Service to send email using one of following options
 * SMTP or sendmail or Amazon SES
 *
 **************************************************************************************************/

	emailService: {
		
		smtpTransport: undefined,

		/*
		 * Client can use different protocols and service by initializing 
		 * service as needed. If Init is not called module will try to load
		 * configuration from .env file
		 *
		 *
		 *
		 * initialized the service before using it to send email.
	 	 * protocol: SMTP, sendmail ...
		 * service: google,SendGrid (bulk)
		 * user: user@gmail.com
		 * pass: pass1234
		 */
		init: function(service, user, password){
			smtpTransport = nodemailer.createTransport(
				{   service: service, 
					auth: {
							user:user, 
							pass:password
						  } 
				}
			);
		},
		



		/*
	 	* Good for sending single email, for sending in bulk look at bulk.   
	 	* If service is not initialized, module will try to load
		* configuration from .env file
 	    *
 	    *
 	    *   mailOptions: {
 	    *   	from: "name <user1@mail.com>",
		*		to  : "user2@mail.com",
		*		subject: "yo",
		*		text: "plain text message",
		*		html: "<p>you got the <strong>idea</strong>.</p>"
		*		}
		*		
		*		
	 	*/			
		send: function(mailOptions){
			if(!smtpTransport){
				console.log("loading from properties file");
				
				//load from configured default properties 



				init(clientProperties.emailService, 
					clientProperties.emailUser, clientProperties.emailPass);
				
			}

			smtpTransport.sendMail(mailOptions, function(err, res){

				if(err){
					//you might want to add record, fix service
					console.error("Failed to send email. "+err);
				}else{
					console.log("email was delivered to :"+mailOptions.to + ", from : "+mailOptions.from);
				}
			});


			
		},




		/** 
		 * BULK EMAILs
		 * Bulk email can be sent using this function. 
		 * Application decide to send email with default properties like from, subject, same text, html etc.
		 * This function uses SMTP-SendGrid		 
		 *
		 *
		 *
		 * emails : list of emails to be send to
		 * subject: line of subject
		 * text: text in email
		 * html: if any html 
		 * files: array of file: {path: 'path', fileName:'filename'}
		 * cb: callback function
		 *
		 *

		 */
		bulk: function(emails, subject, text, html, files, cb){
			
			var email = new sendgrid.Email();
			email.setFrom(clientProperties.fromEmail);
			email.addHeader('X-Sent-Using', 'SendGrid-API');
			email.addHeader('X-Transport', 'web');
			email.setText(text);
			email.setSubject(subject);
			email.setHtml(html);

			if(files){
				for (var i = 0; i < files.length; i++) {
					email.addFile(files[i]);
				};

			}

			for (var i = 0; i < emails.length; i++) {
				email.addTo(emails[i]);
			};

			sendgrid.send(email, function(err, json) {
  				if (err) { 
  					console.error(err); 
  					cb(err);
  				}
  				
  				console.log(json);
  				cb(err);
			});

		},

	},

/***************************************************************************************************
 * Upload Service to upload and download documents to and from Amazon S3 or local file system 
 * 
 *
 **************************************************************************************************/
	uploadService: {
		//default upload 

		/**
		 * Upload to local storage
		 * In Production use external storage. 	
		 * returns uploadedFiles = [{fd: "path/url to file", fileName:"name of file.pdf"}, {fd:"", fileName:""},...]
		 */

		uploadLocal: function(req, res){
			console.log("in file upload");
			req.file('file')
				.upload({
					maxBytes: 1000000,
				}, function done(err, uploadedFiles){
					if(err) {
						console.log("Error uploading file :"+err);
						return res.serverError(err);
					}
					else{
					
						console.log("file upload completed.");
						console.log(uploadedFiles);

						return res.json(uploadedFiles);
	
					} 
				})
		},


		uploadToExternalStorage: function(req, res){

			console.log("Bucket name : "+process.env.S3_BUCKET);
			try{
				req.file('file')
					.upload({
						    	adapter: require('skipper-s3'),
	  							bucket: process.env.S3_BUCKET,
	      						key: process.env.S3_KEY,
	      						secret: process.env.S3_SECRET
					}, 
					function done(err, uploadedFiles){
						if(err){
							console.log(err);
							return res.serverError(err);
						} else {
							return res.json(uploadedFiles);
						}

					})
			}catch(error){

				console.error('Error in uploadToExternalStorage : '+error);

				return res.serverError(error);
			}


		},

		download: function(req, res){
			fs.createReadStream(req.param('path'))
				.on('error', function(err){
					return res.serverError(err);
				})
				.pipe(res);
		}


	},

/***************************************************************************************************
 * Generate token 
 * 
 *
 **************************************************************************************************/

	token: {
		generate: function(){
			return { value: uuid.v4(), issuedAt: new Date() };
		}
	},


	demo: {
		print: function(msg){
			console.log("printing message from demo:"+msg);
		}
	},

	serviceName: function(){
		return "generic";
	},
	version: function(){
		return "1.0.0";
	},
	description: function(){
		return "Generic Service";
	}


};



module.exports = generic;