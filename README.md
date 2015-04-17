# generic module

var generic = require('generic');

//from your controller 

upload: function(req, res){
		generic.uploadService.uploadLocal(req, res);
}
