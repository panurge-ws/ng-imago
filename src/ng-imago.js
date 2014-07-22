/*
 * ng-img-manager
 * https://github.com/panurge-ws/ng-imgmanager
 *
 * Copyright (c) 2014 Panurge Web Studio
 * Licensed under the MIT license.
 */

/*global window */
/*global jQuery */
/*global console */
/*global matchMedia */
/*global $ */
(function(angular, undefined) {

    'use strict';

    // @private
    // defaults
    var default_settings = {
        // Append a random string to the URL to force reload
        avoid_cache: true,
        // Remove the bindings of the attributes when the images is loaded for performance reasons
        unbind_when_loaded: true,
        // The name of the class added to the image when loaded
        loaded_class: "ng-imago-loaded",
        // The name of the class added to the image while it's loading
        loading_class: "ng-imago-loading",
        // The name of the class added to the image when an error has occurred
        error_class: "ng-imago-error",
        // auto-size
        // Scale mode
        scale: 'fit', // [fit | cover]
        // Center the image
        center: true, // center inside the container
        // The container type to scale and/or center the image
        container: 'parent' // ["parent" | "window"]
    };

    var default_sizes = [

        {
            attr: 'default',
            query: 'only screen and (min-width: 1px)'
        }, {
            attr: 'small',
            query: 'only screen and (min-width: 480px)'
        }, {
            attr: 'medium',
            query: 'only screen and (min-width: 768px)'
        }, {
            attr: 'large',
            query: 'only screen and (min-width: 1280px)'
        }, {
            attr: 'xlarge',
            query: 'only screen and (min-width:1281px)'
        }
    ];

    var resize_initialized = false;

    if (angular.isUndefined(matchMedia)) {
        throw "matchMedia does not exist. Please use a polyfill";
    }

    // Events
    var EVENT_IMG_LOADED = "$ngImagoImageLoaded",
        EVENT_IMG_ERROR = "$ngImagoImageError",
        EVENT_IMG_LOAD_REQUEST = "$ngImagoLoadRequest",
        EVENT_IMG_QUEUE_INDEX_COMPLETE = "$ngImagoQueueIndexComplete",
        EVENT_IMG_QUEUE_COMPLETE = "$ngImagoLoadQueueComplete",
        EVENT_IMG_RESIZE = "$ngImagoImageResize",
        EVENT_WINDOW_RESIZE = "$ngImagoWindowResize",
        EVENT_MEDIA_QUERY_CHANGED = "$ngImagoMediaQueryChanged";

    var ngImagoModule = angular.module('ngImago', []);

    ngImagoModule.value('utilsQueries', {
        'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), ' +
            'only screen and (min--moz-device-pixel-ratio: 2), ' +
            'only screen and (-o-min-device-pixel-ratio: 2/1), ' +
            'only screen and (min-device-pixel-ratio: 2), ' +
            'only screen and (min-resolution: 192dpi), ' +
            'only screen and (min-resolution: 2dppx)',
        'portrait': 'only screen and (orientation: portrait)'
    });

    ngImagoModule.provider('ngImago', [

        function() {

            this.defaultsSettings = function(value) {

                if (!angular.isUndefined(value)) {
                    if (value !== '') {
                        for (var prop in default_settings) {
                            if (!angular.isUndefined(value[prop])) {
                                default_settings[prop] = value[prop];
                            }
                        }
                    }
                } else {
                    return default_settings;
                }

            };

            this.defaultsSizes = function(value) {

                if (!angular.isUndefined(value)) {
                    if (value !== '') {
                        for (var prop in default_sizes) {
                            if (!angular.isUndefined(value[prop])) {
                                default_sizes[prop] = value[prop];
                            }
                        }
                    }
                } else {
                    return default_sizes;
                }

            };

            this.addDefaultSize = function(attr, query) {

                default_sizes.push({
                    "attr": attr,
                    "query": query
                });

            };

            this.changeDefaultSize = function(attr, query) {
                for (var i = default_sizes.length - 1; i >= 0; i--) {
                    if (default_sizes[i].attr === attr) {
                        default_sizes[i].attr = query;
                    }
                }
            };

            this.removeDefaultSize = function(attr) {
                for (var i = default_sizes.length - 1; i >= 0; i--) {
                    if (default_sizes[i].attr === attr) {
                        default_sizes.splice(i, 1);
                        break;
                    }
                }
            };

            this.$get = angular.noop;

        }
    ]);

    ngImagoModule.service('ngImagoAttributeParser', ["$window", "$log", "$rootScope", "utilsQueries",

        function($window, $log, $rootScope, utilsQueries) {

            var ngImagoAttributeParser = {};

            ngImagoAttributeParser.mediaQueries = [];

            ngImagoAttributeParser.calculateUrl = function(attrs, options) {


                var source = ngImagoAttributeParser.getUrlForAttrs(attrs, options);

                if (source === "") {
                    $log.error("[ngImagoModule] -> no-url-for-image", attrs);
                    return false;
                }

                return source;
            };

            ngImagoAttributeParser.getUrlForAttrs = function(attrs, options) {

                var attrMatching = null,
                    defaultAttr = null;

                for (var attr in attrs) {

                    if (!angular.isUndefined(attr) && !angular.isUndefined(attrs[attr])) {

                        var attrClean = attr.replace('Portrait', '');
                        var searchPortrait = attr.indexOf("Portrait") > -1;

                        var requestQuerySet = _getQuerySetByAttr(attrClean);

                        if (requestQuerySet != null) {
                            var query = "";

                            if (!angular.isUndefined(options[attr])) {
                                query = options[attr];

                            } else {
                                query = requestQuerySet.query;
                            }

                            var mediaQueryRequested = _mediaQueryExists(query);

                            if (mediaQueryRequested === false) {
                                mediaQueryRequested = _addMediaQuery(query);
                                
                            }

                            //console.log("attr",mediaQueryRequested.media,mediaQueryRequested.matches)

                            if (searchPortrait) {

                                if (mediaQueryRequested.matches && ngImagoAttributeParser.portraitQuery.matches) {
                                    attrMatching = attrs[attr];
                                } else if (attrMatching == null) {
                                    defaultAttr = attrs[attr];
                                }
                            } else {

                                if (mediaQueryRequested.matches) {
                                    attrMatching = attrs[attr];
                                } else if (attrMatching == null) {
                                    defaultAttr = attrs[attr];
                                }
                            }

                        }
                    }

                }


                if (attrMatching === null && defaultAttr !== null) {
                    attrMatching = defaultAttr;
                }


                if (attrMatching === null || angular.isUndefined(attrMatching)) {
                    return "";
                } else {
                    return ngImagoAttributeParser.parseAttr(attrMatching, attrs, options);
                }
            };

            ngImagoAttributeParser.mediaQueryHandler = function(mq) {
                /*if (mq.matches || mq.media.indexOf('portrait') > -1) {
                    
                }*/
                $rootScope.$broadcast(EVENT_MEDIA_QUERY_CHANGED);

            };

            var _addMediaQuery = function(query) {
                var mq = matchMedia(query);
                mq.addListener(ngImagoAttributeParser.mediaQueryHandler);
                ngImagoAttributeParser.mediaQueries[query] = mq;
                return ngImagoAttributeParser.mediaQueries[query];
            };

            var _removeMediaQuery = function(query) {

            };

            var _mediaQueryExists = function(query) {
                if (angular.isUndefined(ngImagoAttributeParser.mediaQueries[query])) {
                    return false;
                } else {
                    return ngImagoAttributeParser.mediaQueries[query];
                }
            };

            var _getQuerySetByAttr = function(attr) {
                for (var i = 0; i < default_sizes.length; i++) {
                    if (default_sizes[i].attr === attr) {
                        return default_sizes[i];
                    }
                }
                return null;
            };

            var _getQuerySetByQuery = function(query) {
                for (var i = 0; i < default_sizes.length; i++) {
                    if (default_sizes[i].query === query) {
                        return default_sizes[i];
                    }
                }
                return null;
            };



            ngImagoAttributeParser.parseAttr = function(imageUrl, attrs, options) {
                var _outUrl = "";

                if (imageUrl.indexOf(",") > -1) {
                    var _images_split = imageUrl.split(",");
                    angular.forEach(_images_split, function(img) {
                        if (ngImagoAttributeParser.isRetina === true && img.indexOf('@2x') > -1) {
                            _outUrl = img;
                        } else if (ngImagoAttributeParser.isRetina === false) {
                            _outUrl = img;
                        }
                    });
                } else {
                    _outUrl = imageUrl;
                }

                /*if (ngImagoAttributeParser.portraitQuery.matches && getSetting('portrait', options) === true) {
                    var ext = _outUrl.substr(_outUrl.lastIndexOf('.'));
                    var path = _outUrl.substr(0, _outUrl.lastIndexOf('.'));
                    _outUrl = path + getSetting('portrait_suffix', options) + ext;
                }*/

                return _outUrl;
            };
            // set utils
            ngImagoAttributeParser.isRetina = matchMedia(utilsQueries.retina).matches;
            ngImagoAttributeParser.portraitQuery = _addMediaQuery(utilsQueries.portrait);

            return ngImagoAttributeParser;
        }
    ]);

    ngImagoModule.service('ngImagoService', ['$rootScope',

        function($rootScope) {

            var ngImagoService = {};

            ngImagoService.queue = [];
            ngImagoService.currIndex = -1;
            ngImagoService.perc = 0;
            ngImagoService.perc_items = 0;

            $rootScope.$on(EVENT_IMG_LOADED, function(event, data, element) {

                ngImagoService.remove(data, element);
            });

            $rootScope.$on(EVENT_IMG_ERROR, function(event, data) {
                ngImagoService.remove(data);
            });

            ngImagoService.loadQueueIndex = function(index) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, {
                    type: 'queueIndex',
                    index: index
                });
            };

            ngImagoService.loadByAttribute = function(attrName, attrValue) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, {
                    type: 'attr',
                    name: attrName,
                    value: attrValue,
                    index: 0
                });
            };

            ngImagoService.loadByClass = function(className) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, {
                    type: 'class',
                    class: className,
                    index: 0
                });
            };

            ngImagoService.loadImageById = function(id) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, {
                    type: 'id',
                    id: id,
                    index: 0
                });
            };

            ngImagoService.add = function(obj) {

                var indexGroup = ngImagoService.indexExists(obj.index);
                if (!indexGroup) {
                    indexGroup = {
                        index: obj.index,
                        items: []
                    };
                    ngImagoService.queue.push(indexGroup);
                }

                if (ngImagoService.itemExists(indexGroup.items, obj)) {
                    return;
                }

                indexGroup.items.push(obj);

                ngImagoService.queue.sort(function(a, b) {
                    return a.index - b.index;
                });

            };

            ngImagoService.indexExists = function(index, andRemove) {

                if (!ngImagoService.queue || ngImagoService.queue.length === 0) {
                    return false;
                }

                for (var i = ngImagoService.queue.length - 1; i >= 0; i--) {
                    if (ngImagoService.queue[i].index === index) {
                        if (andRemove === true) {
                            return ngImagoService.queue.splice(i, 1);
                        } else {
                            return ngImagoService.queue[i];
                        }
                    }
                }

                return false;
            };

            ngImagoService.itemExists = function(dict, obj, andRemove) {

                if (dict === null) {
                    var indexGroup = ngImagoService.indexExists(obj.index);
                    if (indexGroup && indexGroup.items && indexGroup.items.length > 0) {
                        dict = indexGroup.items;
                    }
                }

                if (!dict || dict.length === 0) {
                    return false;
                }

                for (var i = dict.length - 1; i >= 0; i--) {
                    if (dict[i].url === obj.url) {
                        if (andRemove === true) {
                            return dict.splice(i, 1);
                        } else {
                            return dict[i];
                        }
                    }
                }

                return false;
            };

            ngImagoService.removeQueueIndex = function(index) {

                if (!ngImagoService.queue || ngImagoService.queue.length === 0) {
                    return false;
                }

                for (var i = ngImagoService.queue.length - 1; i >= 0; i--) {
                    if (ngImagoService.queue[i].index === index) {
                        return ngImagoService.queue.splice(i, 1);
                    }
                }

                return false;
            };

            ngImagoService.remove = function(obj, element) {


                if (angular.isUndefined(obj)) {
                    return;
                }

                var thisIndex = obj.index;

                var indexGroup = ngImagoService.indexExists(obj.index);

                var item = ngImagoService.itemExists(indexGroup.items, obj, true);


                if (indexGroup && indexGroup.items.length === 0) {

                    ngImagoService.removeQueueIndex(indexGroup.index);

                    $rootScope.$broadcast(EVENT_IMG_QUEUE_INDEX_COMPLETE, thisIndex, obj, element);

                    for (var i = 0; i < ngImagoService.queue.length; i++) {
                        if (ngImagoService.queue[i] && ngImagoService.queue[i].items && ngImagoService.queue[i].items.length > 0) {
                            ngImagoService.currIndex = ngImagoService.queue[i].index;
                            break;
                        }
                    }

                    if (ngImagoService.queue.length === 0) {
                        $rootScope.$broadcast(EVENT_IMG_QUEUE_COMPLETE, thisIndex, obj, element);
                    } else {
                        $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, {
                            type: "index",
                            index: ngImagoService.currIndex
                        });
                    }

                }
            };

            return ngImagoService;

        }
    ]);



    /// DIRECTIVE ///

    ngImagoModule.directive('ngImago', ['ngImagoService', 'ngImagoAttributeParser', '$rootScope', '$window', '$log', '$parse',
        function(ngImagoService, ngImagoAttributeParser, $rootScope, $window, $log, $parse) {

            return {
                priority: 950, // set to 1000 so ImageResize loader can execute after
                //replace:true,
                scope: true,
                restrict: 'A',
                controller: function($scope, $element, $attrs, $transclude) {

                    // flags
                    $scope.loaded = false;
                    $scope.initialized = false;
                    // this is the actual value of the "src" attribute
                    // $scope.options.source_to_set is the promised value of the same attribute
                    $scope.source = "";
                    // an object with options passed to ng-imago=""; 
                    // it's used to override default options
                    $scope.options = {};

                    var _request_load_listener, _watch_attrs_fn, _watch_resp_fn;

                    // check if src is empty
                    if (!angular.isUndefined($attrs.src)) {
                        $log.error("[ngImagoModule] -> You can't use ngImagoMng module with 'src' attribute in the <img> tag. Remove src='" + $attrs.src + "'");
                    }

                    // shortcut fns 
                    function _getSetting(key) {
                        return getSetting(key, $scope.options);
                    }

                    function setOptions() {
                        $scope.options = angular.isUndefined($attrs.ngImago) || $attrs.ngImago === "" ? {} : $scope.$eval($attrs.ngImago);
                    }

                    function calcUrl() {

                        $scope.options.source_to_set = ngImagoAttributeParser.getUrlForAttrs($attrs, $scope.options);

                        if ($scope.options.source_to_set === "") {
                            $log.error("[ngImagoModule] -> no-url-for-image", $attrs);
                            return false;
                        }

                        if ($scope.source === $scope.options.source_to_set) {
                            return false;
                        }

                        return $scope.options.source_to_set;
                    }

                    function init() {


                        if ($scope.options && $scope.options.source_to_set && $scope.options.source_to_set !== "") {

                            // remove from the queue if a url was added before
                            ngImagoService.itemExists(null, {
                                index: $scope.options.queue_index,
                                url: $scope.options.source_to_set
                            }, true);

                        }

                        setOptions();

                        $scope.initialized = true;

                        $scope.options.auto_load = $attrs.autoLoad === "false" ? false : true;

                        $scope.options.queue_index = angular.isUndefined($attrs.queueIndex) ? 0 : Number($attrs.queueIndex);
                        $scope.options.source_to_set = ngImagoAttributeParser.calculateUrl($attrs, $scope.options);

                        if ($scope.options.source_to_set === false) { // no resource has been found
                            return;
                        }
                        // avoid reset the same src
                        if ($scope.source === $scope.options.source_to_set) {
                            return;
                        }

                        if ($scope.options.auto_load === true) {
                            ngImagoService.add({
                                index: $scope.options.queue_index,
                                url: $scope.options.source_to_set
                            });
                        }

                        if ($scope.options.queue_index < 1 && $scope.options.auto_load === true) {

                            startLoadImage(false, $scope.options.auto_load);

                        } else if ($scope.options.queue_index > 0 || $scope.options.auto_load === false) {

                            _request_load_listener = $rootScope.$on(EVENT_IMG_LOAD_REQUEST, onLoadImgRequest);

                        }


                    }



                    function onLoadImgRequest(ev, data) {

                        if ($scope.loaded || angular.isUndefined(data)) {
                            return;
                        }


                        var canLoadIndex = $scope.options.queue_index === data.index;
                        var canQueue = false;
                        var canLoad = false;

                        switch (data.type) {

                            case 'attr':
                                var attrName = $attrs.$normalize(data.name);
                                canQueue = !angular.isUndefined($attrs[attrName]) && $attrs[attrName] === data.value;
                                break;
                            case 'class':
                                canQueue = $element.hasClass(data.class);
                                break;
                            case 'id':
                                canQueue = $element.attr('id') === data.id;
                                break;
                            case 'queueIndex':
                                canQueue = $scope.options.queue_index === data.index;
                                break;

                        }

                        var objToQueue = {
                            index: $scope.options.queue_index,
                            url: $scope.options.source_to_set

                        };

                        if (($scope.options.auto_load && canLoadIndex) ||
                            (data.type === 'queueIndex' && $scope.options.queue_index === data.index)) {
                            canLoad = true;
                        } else if (canLoadIndex && data.index > 0) {
                            canLoad = ngImagoService.itemExists(null, objToQueue) !== false;
                        } else if (canQueue && $scope.options.queue_index === 0) {
                            canLoad = true;
                        }

                        if (canQueue) {
                            ngImagoService.add(objToQueue);
                        }

                        if (canLoad) {
                            startLoadImage(false, true);
                        }
                    }

                    $scope.onImageError = function() {

                        $element.off("load", $scope.onImageLoad);
                        $element.off("error", $scope.onImageError);

                        $scope.loaded = false;

                        $log.error("[ngImagoModule] -> error loading URL", $scope.options.source_to_set);

                        $element.removeClass(_getSetting('loading_class'));
                        $element.addClass(_getSetting('error_class'));

                        // we go on with the queue even tough error to avoid blocking other images
                        $rootScope.$broadcast(EVENT_IMG_ERROR, {
                            url: $scope.options.source_to_set,
                            index: $scope.options.queue_index


                        });

                        $scope.$digest();
                    };

                    $scope.onImageLoad = function() {

                        $element.off("load", $scope.onImageLoad);
                        $element.off("error", $scope.onImageError);

                        $scope.loaded = true;


                        $element.removeClass(_getSetting('loading_class'));
                        $element.addClass(_getSetting('loaded_class'));

                        if (_getSetting('unbind_when_loaded') && _request_load_listener) {
                            _request_load_listener();
                            _watch_attrs_fn();
                            _watch_resp_fn();
                        }


                        $rootScope.$broadcast(EVENT_IMG_LOADED, {
                            url: $scope.options.source_to_set,
                            index: $scope.options.queue_index,
                        }, $element);

                        $scope.$digest();
                    };

                    function startLoadImage(recalcURL, forceLoad) {

                        if (recalcURL === true) {
                            if (calcUrl() === false) {
                                return;
                            }
                        }

                        if (!$scope.options.auto_load && forceLoad !== true) {
                            return;
                        }

                        $element.off("load", $scope.onImageLoad);
                        $element.off("error", $scope.onImageError);

                        if ($scope.loaded) {
                            $element.removeClass(_getSetting('error_class'));
                            $element.removeClass(_getSetting('loaded_class'));
                        }
                        $element.addClass(_getSetting('loading_class'));

                        $element.on("load", $scope.onImageLoad);
                        $element.on("error", $scope.onImageError);

                        $scope.source = $scope.options.source_to_set;

                        $scope.loaded = false;

                        imageSetSource($element, $scope.options.source_to_set, _getSetting('avoid_cache'));

                    }

                    function imageSetSource(image, source_to_set, avoid_cache) {

                        if (avoid_cache) {
                            image.attr("src", source_to_set + "?c=" + Math.round(Math.random() * 100000));
                        } else {
                            image.attr("src", source_to_set);
                        }
                    }

                    $rootScope.$on(EVENT_MEDIA_QUERY_CHANGED, function() {

                        if ($scope.initialized) {
                            startLoadImage(true, ($scope.options.auto_load || $scope.loaded)); // TODO params
                        }

                    });

                    _watch_attrs_fn = $scope.$watch(function() {
                        return [$element.attr('auto-load'), $element.attr('queue-index')];
                    }, function(nv, ov) {

                        if ($scope.initialized) {

                            $attrs.autoLoad = nv[0];
                            $attrs.queueIndex = nv[1];

                            init();
                        }
                    }, true);


                    _watch_resp_fn = $scope.$watch(function() {

                        var listenerAttr = [];

                        for (var i = 0; i < default_sizes.length; i++) {
                            listenerAttr.push($element.attr(default_sizes[i].attr));
                        }
                        return listenerAttr;

                    }, function(nv, ov) {
                        if ($scope.initialized) {

                            for (var i = 0; i < default_sizes.length; i++) {
                                $attrs[default_sizes[i].attr] = nv[i];
                            }

                            // TODO remove from queue old url
                            startLoadImage(true, $scope.options.auto_load || $scope.loaded);

                        } else {

                            init();
                        }
                    }, true);

                }

            };

        }
    ]);

    ngImagoModule.directive('imagoResize', ["$window", "$rootScope",

        function($window, $rootScope) {
            return {

                require: 'ngImago',
                controller: function($scope, $element, $attrs) {
                    var _options = angular.isUndefined($attrs.imagoResize) ? {} : $scope.$eval($attrs.imagoResize);


                    $scope.$watch('loaded', function(nv, ov) {
                        if (nv === true) {
                            layout();
                        }
                    });

                    function layout() {
                        var scaleMode = getSetting('scale', _options);
                        var center = getSetting('center', _options);

                        // TODO allow other methods to select the parent
                        if (scaleMode === "cover" || scaleMode === "fit" || center === true) {

                            var container = getSetting('container', _options);

                            var tW = $element[0].width,
                                tH = $element[0].height;

                            if (container === "parent") {
                                var parent = $element.parent();
                                if (parent && parent.length > 0) {
                                    var parComW = parseInt(getStyle(parent[0],"width"),10);
                                    var parComH = parseInt(getStyle(parent[0],"height"),10);
                                    tW = parComW;
                                    tH = parComH;
                                }

                            } else if (container === "window") {
                                tW = $window.innerWidth;
                                tH = $window.innerHeight;
                            }

                            var new_dim = resizeImageWithRatio($element[0].width, $element[0].height, tW, tH, scaleMode, center);

                            $element[0].width = new_dim.width;
                            $element[0].height = new_dim.height;

                            var position = getStyle($element[0], 'position');

                            if (center === true) {
                                if (position === "fixed" || position === "absolute") {
                                    $element.css({
                                        top: new_dim.top + "px",
                                        left: new_dim.left + "px"
                                    });
                                } else {
                                    $element.css({
                                        marginTop: new_dim.top + "px",
                                        marginLeft: new_dim.left + "px"
                                    });
                                }
                            }
                        }

                        $rootScope.$broadcast(EVENT_IMG_RESIZE, {
                            url: $scope.options.source_to_set,
                            elem: $element,
                        });

                    }

                    // TODO param windows or parent
                    $rootScope.$on(EVENT_WINDOW_RESIZE, function() {

                        if ($scope.loaded) {
                            layout();
                        }

                    });

                    if (!resize_initialized) {

                        $window.onresize = function() {
                            // TODO set a debounce
                            $rootScope.$broadcast(EVENT_WINDOW_RESIZE);
                        };

                        resize_initialized = true;
                    }
                }
            };
        }
    ]);





    // UTILS


    function getStyle(elem, styleProp) {
        if (window.jQuery && window.jQuery.fn.css) {
            return $(elem).css(styleProp);
        }
        return window.getComputedStyle ? window.getComputedStyle(elem)[styleProp] : elem.currentStyle ? elem.currentStyle[styleProp] : '';
    }

    function getSetting(key, options) {

        if (options && !angular.isUndefined(options[key])) {
            return options[key];
        } else {
            return default_settings[key];
        }
    }

    function resizeImageWithRatio(targetW, targetH, containerW, containerH, mode, isToBeCentered) {
        var props = {
            width: targetW,
            height: targetH
        };
        var ratio = targetW / targetH;

        if (mode === "fit") {
            if (containerH / containerW > targetH / targetW) {
                props = {
                    width: containerW,
                    height: containerW / ratio
                };
            } else {
                props = {
                    width: containerH * ratio,
                    height: containerH
                };
            }
        } else if (mode === "cover") {
            if (containerH / containerW > targetH / targetW) {
                ratio = targetW / targetH;
                if (containerH * ratio < containerW) {
                    props = {
                        width: containerW,
                        height: containerW / ratio
                    };
                } else {
                    props = {
                        width: containerH * ratio,
                        height: containerH
                    };
                }
            } else {
                if (containerW / ratio < containerH) {
                    props = {
                        width: containerH * ratio,
                        height: containerH
                    };
                } else {
                    props = {
                        width: containerW,
                        height: containerW / ratio
                    };
                }
            }
        }

        if (isToBeCentered === true) {
            props.top = (containerH - props.height) / 2;
            props.left = (containerW - props.width) / 2;
        }
        return props;
    }

    // TODO

    /*ngImagoModule.directive('ngMultiresSource', ['ngImagoAttributeParser',
        function(ngImagoAttributeParser) {

            var directiveDefinitionObject = {
                link: function($scope, $element, $attrs, controller) {

                    var $video = $($element);

                    var video_sources = ngImagoAttributeParser.getUrlForAttrs($attrs);
                    if (video_sources) {
                        video_sources = angular.fromJson(video_sources);
                    }
                    if (video_sources && video_sources.length > 0) {
                        var html = "";
                        for (var i = 0; i < video_sources.length; i++) {
                            html += '<source src="' + video_sources[i].src + '" type="' + video_sources[i].type + '" />';
                        };

                        $video.html(html)
                    }
                    //console.log("ngMultiresSource", sources)

                }

            }

            return directiveDefinitionObject;

        }
    ]);

    ngImagoModule.directive('ngMultiresBkg', ['ngImagoAttributeParser',
        function(ngImagoAttributeParser) {

            var directiveDefinitionObject = {
                link: function($scope, $element, $attrs, controller) {

                    var urls = angular.fromJson($attrs.ngMultiresBkg); // we expect here a json string

                    var sizes = [{
                        size: "small",
                        min_width: _small_min_width
                    }, {
                        size: "medium",
                        min_width: _medium_min_width
                    }, {
                        size: "large",
                        min_width: _large_min_width
                    }, {
                        size: "xlarge",
                        min_width: _large_min_width + 1
                    }];

                    var source_to_set = ngImagoAttributeParser.getUrlForAttrs(urls);

                    if (source_to_set != "")
                        $($element).css({
                            backgroundImage: "url(" + source_to_set + ")"
                        });

                }

            }

            return directiveDefinitionObject;

        }
    ]);*/

})(window.angular);
