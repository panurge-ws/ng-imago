// NG app init
var app = angular.module('app', ['ngImago']);


app.controller('AppCtrl', ['$scope', '$timeout', '$rootScope', 'ngImagoService', function ($scope, $timeout, $rootScope, ngImagoService) {
		
		$scope.logMsg = "";
		var img2 = document.getElementById('img2');
		
		$timeout(function(){
			
			//angular.element(img2).attr('desktop',"http://www.placehold.it/1024x600&text=Loaded2000msafter");
			//angular.element(img2).attr('desktop',"url-not-existing");
			//$rootScope.$digest();
			console.log(angular.element(img2).scope());
			
			//$rootScope.$broadcast("$ngImagoLoadRequest", 'group3', 'group');
			// above completly equivalent of
			ngImagoService.loadGroup('group3'); // the group specified in options {loadGroup:}


		}, 2000)

		$timeout(function(){
			
			ngImagoService.loadQueueIndex(3);

		}, 4000)

		$timeout(function(){
			
			ngImagoService.loadImageById('img4'); // the image id attribute

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
			
			if (data == 3){
				//ngImagoService.loadQueueIndex(4);
			}
		});
		

}])