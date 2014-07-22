## Ng-Imago
---

Ng-Imago is a module for AngularJS that aims to be a comprehensive library to manage images into your app.

Currently it's focused on:

1. **Multi sources responsivness**
2. **Sequential loading**
3. **Auto-resize**

## Requirements
---
Insert AngularJS in your head tags. Eg.:
```html
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js"></script>
```
## Install
---
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/aboschini/ng-imago/master/dist/ng-imago.min.js
[max]: https://raw.github.com/aboschini/ng-imago/master/dist/ng-imago.js
**HTML:** import the script in your HTML
```html
<script src="[path_to_library]/ng-imago.js"></script>
```
**Javascript code:** inject the module in Angular
```javascript
var app = angular.module('app', ['ngImago']);
```
You can also configure the defaults value. See below (Configuration).



## Responsiveness*
---
### Use ng-imago to load the images according to a given resolution, exactly as you usually do with Media queries inside CSS.

In your HTML, insert a **img** tag and add the **ng-imago** directive. 
Set attibutes for each resolution you want to support, passing inside the attribute the url of the image.
```html
<img ng-imago      
     default="default.jpg" 
     small="small.jpg   
     medium="medium.jpg"  
     large="large.jpg"
     xlarge="xlarge.jpg"
     medium-portrait="medium-portrait.jpg"  />
```
For the default values for each attribute, please see below (Defaults).
**Attention: you can't set the "src" attribute using Ng-Imago.** Why? See below.

**Pixel density support (Retina)**

If you want to support Pixel density, you can simply set two URLs (comma separated) in the attribute: if one of them has the "**@2x**" suffix in the name, Ng-Imago will load that in screen with pixel density > 1.
```html
<img ng-imago
     medium="default.jpg,default@2x.jpg"  />
```

**Orientation support**
_(We are testing this feature, anyway...)_
If you set an attibute with a "-portrait" suffix, Ng-Imago will load that source if: 
1) the resolution matches the attribute (medium => (min-width: 768px) and 
2) if the device orientation is portrait 
```html
<img ng-imago  
     medium="medium.jpg"  
     medium-portrait="medium-portrait.jpg"  />
```

**Angular templates**
You can naturally use the AngularJS templates style to set the attibute's value. They are bindable values, until the image is loaded. (See settings _unbindwhenloaded_ below to further details).
```html
<img ng-imago  
     medium="{{url_medium}}"  
     large="{{url_large}}"  />
```
**Overriding single image**
If you want follow its own rules you can pass to the ng-imago attribute a series of overriding values, for sizes or for settings.
```html
<img ng-imago="{ small:'only screen and (min-width:320px)'}" id="override"
            
            small="{{url_small}}-override" 
            medium="{{url_medium}}" 
            large="{{url_large}}" 
            xlarge="{{url_xlarge}}" 
            />
```

*this library uses matchMedia detection. Yes, there is the usual bla bla about IE8. You can use a [polyfill](https://github.com/paulirish/matchMedia.js/) if you need to support "browsers" that doesn't support matchMedia feature.

## Sequential loading
### (Complete documentation coming soon)

## Default sizes
### (Complete documentation coming soon)

```javascript
'default' => 'only screen and (min-width: 1px)'
'small'   => 'only screen and (min-width: 480px)'
'medium'  => 'only screen and (min-width: 768px)'
'large'   => 'only screen and (min-width: 1280px)'
'xlarge'  => 'only screen and (min-width:1281px)'
```

## Configuration
### (Complete documentation coming soon)

```javascript
var app = angular.module('app', ['ngImago']).config(["ngImagoProvider",
    // configuring defaults option and sizez
    function(ngImagoProvider) {
    	// see the defaults settings and sizes
    	console.log(ngImagoProvider.defaultsSettings());
    	console.log(ngImagoProvider.defaultsSizes()); 
    	// you can use the function as a setter to pass an object with you customized defaults
    	// E.g. defaultsSettings({avoid_cache:false, loaded_class:'my-loaded-class'});
    	// add a custom size attribute with custom media query
    	ngImagoProvider.addDefaultSize('custom', 'only screen and (min-width:400px)');
    }
]);
```








## License
Copyright (c) 2014 Panurge Web Studio  
Licensed under the MIT license.
