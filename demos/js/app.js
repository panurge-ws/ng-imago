// NG app init
var app = angular.module('app', ['ngImago']).config(["ngImagoProvider",
    
    // configuring defaults option and sizez
    function(ngImagoProvider) {

    	console.log(ngImagoProvider.defaults());

    	// add a custum size: you can add in the image tag the attribute "custom"
    	// to load image when resolution min-width = 2500
    	ngImagoProvider.addDefaultSize('custom', 720);

    }
]);


app.controller('AppCtrl', ['$scope', '$timeout', '$rootScope', 'ngImagoService', function ($scope, $timeout, $rootScope, ngImagoService, apiToken) {
		
		$scope.logMsg = "";

		// same url to bind to the atttributes
		$scope.url_small = "http://www.placehold.it/320x100&text=small";
		$scope.url_medium = "http://www.placehold.it/400x100&text=medium";
		$scope.url_large = "http://www.placehold.it/500x100&text=large";
		$scope.url_xlarge = "http://www.placehold.it/600x100&text=xlarge";

		$scope.loadImageById = function(imageId)
		{
			ngImagoService.loadImageById('img4');

			$timeout(function(){
				$scope.url_small = "http://www.placehold.it/1024x600&text=small-loaded-after";
				$scope.url_medium = "http://www.placehold.it/1024x600&text=later-loaded-after";
				$scope.url_large = "http://www.placehold.it/1024x600&text=large-loaded-after";
				$scope.$digest();
				ngImagoService.loadImageById('img4');
			}, 4000)
		}

		$scope.loadImageByQueueIndex = function(index)
		{
			ngImagoService.loadQueueIndex(index);
		}

		$scope.loadImageChangingAutoLoad = function(imageId)
		{	
			var img = document.getElementById(imageId);
			
			angular.element(img).attr('auto-load',"true");

		}

		$scope.loadImageByClass = function(className)
		{
			ngImagoService.loadByClass(className);
		}

		$scope.loadImageByAttr = function(attrName, attrValue)
		{
			ngImagoService.loadByAttribute(attrName, attrValue);
		}

		$rootScope.$on("$ngImagoLoadQueueComplete",function(event,data){
			//console.log("ngImagoLoadQueueComplete");
			$scope.logMsg += 'ngImagoLoadQueueComplete' + '\n';
		});

		$rootScope.$on("$ngImagoImageLoaded",function(event,data){
			//console.log("ngImagoImageLoaded", data);
			$scope.logMsg += 'ngImagoImageLoaded -> ' + JSON.stringify(data) + '\n';
		});

		$rootScope.$on("$ngImagoQueueIndexComplete",function(event,data){
			//console.log("ngImagoQueueIndexComplete", data);
			$scope.logMsg += 'ngImagoQueueIndexComplete -> ' + data + '\n';
		});
		

}])