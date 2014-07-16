// NG app init
var app = angular.module('app', ['ngImago']);


app.controller('AppCtrl', ['$scope', '$timeout', '$rootScope', 'ngImagoService', function ($scope, $timeout, $rootScope, ngImagoService) {
		
		$scope.logMsg = "";
		
		$scope.url_mobile = "http://www.placehold.it/320x400&text=mobile";
		$scope.url_tablet = "http://www.placehold.it/768x600&text=tablet";
		$scope.url_desktop = "http://www.placehold.it/1024x600&text=desktop";
		$scope.url_xdesktop = "http://www.placehold.it/1280x600&text=xdesktop";

		$scope.loadGroup = function(groupName)
		{
			ngImagoService.loadGroup(groupName);
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

			$timeout(function(){
				$scope.url_desktop = "http://www.placehold.it/1024x600&text=desktop-loaded-after";
				$scope.$digest();
				ngImagoService.loadImageById('img4');
			}, 2000)

		}

		
		
		$timeout(function(){
			
			//angular.element(img2).attr('desktop',"http://www.placehold.it/1024x600&text=Loaded2000msafter");
			//angular.element(img2).attr('desktop',"url-not-existing");
			//$rootScope.$digest();
			
			//$rootScope.$broadcast("$ngImagoLoadRequest", 'group3', 'group');
			// above completly equivalent of
			 // the group specified in options {loadGroup:}


		}, 2000)

		$timeout(function(){
			
			//ngImagoService.loadQueueIndex(3);

		}, 4000)

		$timeout(function(){
			
			 // the image id attribute

		}, 6000)

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