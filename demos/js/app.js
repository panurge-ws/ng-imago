// NG app init
var app = angular.module('app', ['ngImago']).config(["ngImagoProvider",
    
    // configuring defaults option and sizes
    function(ngImagoProvider) {
    	// see the defaults settings and sizes
    	console.log(ngImagoProvider.defaultsSettings());
    	console.log(ngImagoProvider.defaultsSizes()); 
    	// you can use the function as a setter to pass an object with you customized defaults
    	// E.g. defaultsSettings({avoid_cache:true, loaded_class:'my-loaded-class'});
    	// add a custom size attribute with custom media query
    	//ngImagoProvider.addDefaultSize('custom', 'only screen and (min-width:400px)');

    }
]);


app.controller('AppCtrl', ['$scope', '$timeout', '$rootScope', 'ngImagoService', function ($scope, $timeout, $rootScope, ngImagoService, apiToken) {
		
		$scope.logMsg = "";

		$scope.groupImages = [{index:"0"},{index:"0"},{index:"1"},{index:"1"},{index:"2"},{index:"2"},{index:"5"}];

		$scope.image_sources = {'default':'http://www.placehold.it/320x100&text=sources-default','medium':'http://www.placehold.it/320x100&text=sources-medium'};

		$scope.override_options = {'loaded_class':'my-loaded-class'};
		// same url to bind to the atttributes
		$scope.url_default = "http://www.placehold.it/320x100&text=default";
		$scope.url_small = "http://www.placehold.it/320x100&text=small";
		$scope.url_medium = "http://www.placehold.it/400x100&text=medium";
		$scope.url_large = "http://www.placehold.it/500x100&text=large";
		$scope.url_xlarge = "http://www.placehold.it/600x100&text=xlarge";

		$scope.changeUrls = function()
		{
			$scope.url_default = "http://www.placehold.it/400x200&text=default-binding-modified";
			$scope.url_small = "http://www.placehold.it/400x200&text=small-binding-modified";
			$scope.url_medium = "http://www.placehold.it/500x200&text=medium-binding-modified";
			$scope.url_large = "http://www.placehold.it/600x200&text=large-binding-modified";
			$scope.url_xlarge = "http://www.placehold.it/700x200&text=xlarge-binding-modified";

			$scope.image_sources = {'default':'http://www.placehold.it/320x100&text=sources-default-binding-modified','medium':'http://www.placehold.it/320x100&text=sources-medium-binding-modified'};
			$scope.override_options = {'loaded_class':'my-loaded-class-2'};

			//$scope.$digest();
			//ngImagoService.loadImageById('img4');
		}

		$scope.loadImageById = function(imageId)
		{
			ngImagoService.loadImageById('img4');
		}

		$scope.loadImageByQueueIndex = function(index)
		{
			ngImagoService.loadQueueIndex(index);
		}

		$scope.loadImageChangingAutoLoad = function(imageId)
		{	
			var img = document.getElementById(imageId);
			
			angular.element(img).attr('auto-load',"true");

			// or exactly equivalent
			//angular.element(img).scope().load();

		}

		$scope.loadImageByClass = function(className)
		{
			ngImagoService.loadByClass(className);
		}

		$scope.loadImageByAttr = function(attrName, attrValue)
		{
			ngImagoService.loadByAttribute(attrName, attrValue);
		}

		$rootScope.$on("$ngImagoLoadQueueComplete",function(event, data){
			//console.log("ngImagoLoadQueueComplete");
			$scope.logMsg += 'ngImagoLoadQueueComplete' + '\n';
		});

		$rootScope.$on("$ngImagoImageLoaded",function(event, data, element){
			//console.log("ngImagoImageLoaded", data);
			$scope.logMsg += 'ngImagoImageLoaded -> ' + JSON.stringify(data) + '\n';
		});

		$rootScope.$on("$ngImagoQueueIndexComplete",function(event, index, data, element){
			console.log("ngImagoQueueIndexComplete", index, data, element);
			$scope.logMsg += 'ngImagoQueueIndexComplete -> ' + index + '\n';
		});
		

}])