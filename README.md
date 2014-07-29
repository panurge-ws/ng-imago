## Ng-Imago
---

**Ng-Imago is a module for AngularJS that aims to be a comprehensive library for managing images into your project.**

Currently it's focused on:

1. **[Multi resolutions sources](https://github.com/panurge-ws/ng-imago#1-multi-resolutions-sources) (responsive images)**
2. **[Sequential loading](https://github.com/panurge-ws/ng-imago#2-sequential-loading) (automatic or manual)**
3. **[Auto-resize](https://github.com/panurge-ws/ng-imago#3-auto-resize) to parent (contain / cover)**

## Requirements
---
- [AngularJS](http://angularjs.org/)
- [matchMedia polyfill](https://github.com/paulirish/matchMedia.js/) (only if you need to support "browsers" [without native matchMedia](http://caniuse.com/matchmedia) detection. Yes, IE8...)


## Install
---
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/aboschini/ng-imago/master/dist/ng-imago.min.js
[max]: https://raw.github.com/aboschini/ng-imago/master/dist/ng-imago.js
**HTML:** import the script in your HTML
```html
<script src="[path_to_library]/ng-imago.min.js"></script>
```
**Javascript:** inject the module in Angular
```javascript
var app = angular.module('app', ['ngImago']);
```
Here you can also configure the default values. See below ([Configuration](https://github.com/panurge-ws/ng-imago#configuration)).



### HOW TO USE
***

## 1. Multi resolutions sources
---
**Use ng-imago to load images according to a given resolution (or media query), exactly as you usually do with Media queries inside CSS.**

In your HTML, insert a **img** tag and add the **ng-imago** directive. 
You can choose two alternative methods:

1) **Attributes**: set attibutes for each resolution you want to support, passing inside the attribute the url of the image:
```html
<img ng-imago      
     default="default.jpg" 
     small="small.jpg"
     medium="medium.jpg"  
     large="large.jpg"
     xlarge="xlarge.jpg"  />
```
2) **A properties object**: set the attibute "sources" with a JSON object with size and image path(s):
```html
<img ng-imago
     sources="{'default':'default.jpg', 'medium':'medium.jpg'}" />
```
Each attribute/property checks for a corrispettive media query value (e.g.: 'medium' checks for 'only screen and (min-width: 768px)'. If the query matches, it will load the image's url within the attribute.

For the default values of each attribute, please see below ([Defaults](https://github.com/panurge-ws/ng-imago#default-values)).

If "sources" object is defined, attributes values will be ignored.

You can override the value of each attribute for a [single image](https://github.com/panurge-ws/ng-imago#overriding-single-image), or you can override them [globally](https://github.com/panurge-ws/ng-imago#configuration). Furthermore, you can also add your customized attributes.


**Attention: you can't set the "src" attribute using Ng-Imago, otherwise, the sequential loading won't work properly.**


### **Pixel density support (Retina)**

If you want to support different pixel densities, you can simply set two urls (comma separated) in the attribute: if one of them has the "**@2x**" suffix in the name, Ng-Imago will load it in screens with pixel density > 1.
```html
<img ng-imago
     medium="medium.jpg,medium@2x.jpg"  />
<img ng-imago
     sources="{'medium':'medium.jpg,medium@2x.jpg'}"  />
```

### **Orientation support**
_(Still in test)_
If you set an attibute with a "-portrait" suffix, Ng-Imago will load that source if: 
1. the resolution matches the attribute (medium => (min-width: 768px) and
2. if the device orientation is portrait 
```html
<img ng-imago  
     medium="medium.jpg"  
     medium-portrait="medium-portrait.jpg"  />
```

### **Angular templates**

You can naturally use the AngularJS templates style to set the attibute's value. Those values are bindable, at least until the image is loaded. (See the [default settings unbind_when_loaded](https://github.com/panurge-ws/ng-imago#default-settings) below for further details).
```html
<img ng-imago  
     medium="{{url_medium}}"  
     large="{{url_large}}"  />
<img ng-imago
     sources="{{my_sources_object}}"  />
```

### **Overriding single image**
If you want that an image follows its own rules, you can pass to the ng-imago attribute an object of overriding values either for [sizes](https://github.com/panurge-ws/ng-imago#default-sizes) or for [settings](https://github.com/panurge-ws/ng-imago#default-settings).
```html
<img ng-imago="{ small:'only screen and (min-width:320px)', loaded_class:'my-loaded-class' }"
     small="{{url_small}}-override-loaded-when-min-width-is-320px" 
     medium="{{url_medium}}" 
     large="{{url_large}}" 
     xlarge="{{url_xlarge}}"  />
     
Or, if you use a directive tag, insert the values inside an "override" attribute:

<ng-imago override="{ small:'only screen and (min-width:320px)', loaded_class:'my-loaded-class' }"
     small="{{url_small}}-override-loaded-when-min-width-is-320px" 
     medium="{{url_medium}}" 
     large="{{url_large}}" 
     xlarge="{{url_xlarge}}"></ng-imago>  
             
```

### **Using with other tags or with ng-imago tag**
You can use the directive ng-imago also in elements that aren't "img" tags, as "div", "span", etc... In few words, all the elements that accept a background-image style. The module will load an Image object and then it will pass the url to the background-image CSS style. You can also use the ng-imago directive as a tag.
```html
<div            style="width:500px;height:200px;overflow:hidden;"
     ng-imago
     auto-load="false"
     medium="medium.jpg"
     class="div_to_load"
     imago-resize="{scale:'contain', center:false}">
 </div>
 <ng-imago     style="width:500px;height:200px;overflow:hidden;"
     auto-load="false"
     medium="medium.jpg"
     class="div_to_load"
     imago-resize="{scale:'cover', center:true}">
 </ng-imago>
```
Are you wondering why? "Can't we use simply the CSS?" Yes, you can, but you can't control sequential loading... 




## 2. Sequential loading
---
### (Complete documentation coming soon)
### Automatic queueing (AKA The "queue-index" attribute )
The queue-index attribute helps you to load images sequentially. It creates a queue of images based on the attribute's value.
If you set an attribute (queue-index="1"), the images with that attributes will be loaded after all the other images with no queue attribute (or with "queue-index=0") have been loaded. And so on... **Attention**: to start the loading sequence, you must insert at least a queue-index="0" image (or omit the attribute).
```html
<img  ng-imago 
      queue-index="1"
      default="delayed-default.jpg" 
      medium="delayed-medium.jpg" />
```
### Manual queueing / loading
You can set an attribute (auto-load="false") which prevents the image to be immediately loaded. You can load it later, as you need, with some methods.
```html
<img  ng-imago 
      auto-load="false" 
      id="img_111" 
      load-group="group1"
      queue-index="1234"
      class="myImageClass"
      default="delayed-default.jpg" 
      medium="delayed-medium.jpg" />
```
You can use Javascript methods provided in the service called 'ngImagoService', injecting the service in your controller or directive. You can load the image above with the following methods. 
```javascript
// load images with attibutes and values
ngImagoService.loadByAttribute("load-group", "group1");

// load the images with a specified class
ngImagoService.loadByClass("myImageClass");

// load an image by id
ngImagoService.loadImageById('img_111');

// load imags by queue-index (if auto-load="false")
ngImagoService.loadQueueIndex(1234);

// changing the auto-load to true
var img = document.getElementById('img_111');
angular.element(img).attr('auto-load',"true");
// or exactly equivalent
//angular.element(img).scope().load();

```
### Manual load + automatic queue? Yes.
You can mix the two methods setting _auto-load=false_ and _queue-index_. If you have a series of images with _auto-load="false"_ and several _queue-index_ values, at the time you will load that group, it will be loaded sequentially.
E.g.:
```html
<img  ng-imago id="img_0"
      auto-load="false"  
      load-group="group1"
      queue-index="0" 
      medium="delayed-medium0.jpg" />
<img  ng-imago id="img_1"
      auto-load="false"  
      load-group="group1"
      queue-index="2" 
      medium="delayed-medium1.jpg" />
<img  ng-imago id="img_2"
      auto-load="false"  
      load-group="group1"
      queue-index="2" 
      medium="delayed-medium2.jpg" />
```
```javascript
ngImagoService.loadByAttribute("load-group", "group1");
```
It will load the three images but #img_1 and #img_2 will be loaded after #img_0 has been completely loaded.

As a final note, notice that you don't need to set stricly subsequent indeces (1,2,3...). You can set queue-index="3" and queue-index="123": "123" indeces will be loaded after "3", if there are no intermediate indeces...

### Events

Ng-Imago dispatches some events related to loading actions via the $rootScope.
```javascript

// all the images in queue are loaded
$rootScope.$on("$ngImagoLoadQueueComplete", function(event, data){

});
// when a single image is loaded
$rootScope.$on("$ngImagoImageLoaded", function(event, data, element){

});

// when a queue-index group is loaded
$rootScope.$on("$ngImagoQueueIndexComplete", function(event, index, data, element){

});

```

## 3. Auto resize
---
You can set an attibute "imago-resize" with self-explanatory object values.
```html
<div style="width:500px;height:300px">
  <img ng-imago 
       medium="{{url_medium}}"
       imago-resize="{scale:'cover', center:true}" />
</div>
```
Ng-Imago will resize the image to the image's parent. You can set an additional param _'container':'window'_ if you want to scale it to the window's dimensions.



## Configuration
---
**(Complete documentation coming soon)**

```javascript
var app = angular.module('app', ['ngImago']).config(["ngImagoProvider",
    // configuring defaults option and sizez
    function(ngImagoProvider) {
    	// see the defaults settings and sizes
        // used with no value, the following functions are getter
        var myDefaultSettings = ngImagoProvider.defaultsSettings();
        var myDefaultSizes = ngImagoProvider.defaultsSizes();
    	// you can use these functions as a setter passing an object with your customized defaults
    	// E.g.:
        ngImagoProvider.defaultsSettings({avoid_cache:false, loaded_class:'my-loaded-class'});
    	
        // you can add a custom size attribute with custom media query
    	ngImagoProvider.addDefaultSize('custom', 'only screen and (min-width:400px)');
        // or change a default
        ngImagoProvider.changeDefaultSize('small', 'only screen and (min-width:400px)');
        // or remove it (even it doesn't make a lot of sense... you can simply avoid using it)
        ngImagoProvider.removeDefaultSize('small', 'only screen and (min-width:400px)');
    }
]);
```

## Default values
---
## Default sizes

```javascript
'default' => 'only screen and (min-width: 1px)'
'small'   => 'only screen and (min-width: 480px)'
'medium'  => 'only screen and (min-width: 768px)'
'large'   => 'only screen and (min-width: 1280px)'
'xlarge'  => 'only screen and (min-width: 1440px)'
```

## Default settings
### (Complete documentation coming soon)

```javascript
// Appends a random string to the URL to force reload
avoid_cache: true,
// Removes the bindings of the attributes when the images is loaded for performance reasons
unbind_when_loaded: true,
// The name of the class added to the image when loaded
loaded_class: "ng-imago-loaded",
// The name of the class added to the image while it's loading
loading_class: "ng-imago-loading",
// The name of the class added to the image when an error has occurred
error_class: "ng-imago-error",

// auto-size
// Scale mode
scale: 'contain', // [contain | cover]
// Center the image
center: true, // center inside the container
// The container type to scale and/or center the image
container: 'parent' // ["parent" | "window"]
```



## This project is currently in beta version. Use it at your own risk.
---
## Contributors
---

**Reporting issues is much appreciated.
Please, wait some other days (or ask) before pulling requests.**

## Thanks.

## License
Copyright (c) 2014 Panurge Web Studio  
Licensed under the MIT license.
