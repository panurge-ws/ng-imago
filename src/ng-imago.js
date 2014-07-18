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
/*global $ */
(function(angular, undefined) {

    'use strict';

    // @private
    // defaults
    var default_settings = {
        portrait: false,
        portrait_suffix: "-portrait",
        avoid_cache: true,
        unbind_when_loaded: true,
        loaded_class: "ng-imago-loaded",
        loading_class: "ng-imago-loading",
        error_class: "ng-imago-error",
        // size
        scale: 'fit',
        center: true,
        container: 'parent'
    };

    var default_sizes = [{
        attr: 'small',
        min_width: 480
    }, {
        attr: 'medium',
        min_width: 768
    }, {
        attr: 'large',
        min_width: 1280
    }, {
        attr: 'xlarge',
        min_width: 1281
    }];


    // internal
    var resize_initialized = false,
        window_w = 0,
        window_h = 0,
        is_portrait = false;

    // Events
    var EVENT_IMG_LOADED = "$ngImagoImageLoaded",
        EVENT_IMG_ERROR = "$ngImagoImageError",
        EVENT_IMG_LOAD_REQUEST = "$ngImagoLoadRequest",
        EVENT_IMG_QUEUE_INDEX_COMPLETE = "$ngImagoQueueIndexComplete",
        EVENT_IMG_QUEUE_COMPLETE = "$ngImagoLoadQueueComplete",
        EVENT_IMG_RESIZE = "$ngImagoImageResize",
        EVENT_WINDOW_RESIZE = "$ngImagoWindowResize";

    var ngImagoModule = angular.module('ngImago', []);

    ngImagoModule.provider('ngImago', [

        function() {

            this.defaults = function(value) {

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

            this.addDefaultSize = function(attr, min_width) {

                default_sizes.push({
                    "attr": attr,
                    "min_width": min_width
                });
                default_sizes.sort(function(a, b) {
                    return a.min_width - b.min_width;
                });
            };

            this.removeDefaultSize = function(attr) {
                for (var i = default_sizes.length - 1; i >= 0; i--) {
                    if (default_sizes[i].attr === attr) {
                        default_sizes.splice(i, 1);
                    }
                }
            };

            this.$get = angular.noop;

        }
    ]);

    ngImagoModule.service('ngImagoAttributeParser', ["$window",

        function($window) {

            var ngImagoAttributeParser = {};


            ngImagoAttributeParser.pixelRatio = $window.devicePixelRatio ? $window.devicePixelRatio : 1;

            ngImagoAttributeParser.getUrlForAttrs = function(attrs, options) {


                var _sizes = [];

                for (var i = 0; i < default_sizes.length; i++) {

                    var minWidth = getSetting(default_sizes[i].attr, options) ? getSetting(default_sizes[i].attr, options) : default_sizes[i].min_width;
                    _sizes.push({
                        size: default_sizes[i].attr,
                        min_width: minWidth
                    });
                }

                var $elements = [];

                for (i = 0; i < _sizes.length; i++) {
                    if (!angular.isUndefined(attrs[_sizes[i].size])) {
                        $elements.push({
                            url: attrs[_sizes[i].size],
                            min_width: _sizes[i].min_width
                        });
                    }
                }

                if ($elements.length > 0) {

                    // sort by min_width
                    $elements = $elements.sort(function(a, b) {
                        return a.min_width - b.min_width;
                    });

                    var _outUrl = "";
                    _outUrl = ngImagoAttributeParser.parseUrl($elements[$elements.length - 1].url, attrs, options); // set the larger available

                    // loop to find if there is a smaller image to load
                    for (i = 0; i < $elements.length; i++) {
                        if (window_w <= $elements[i].min_width) {
                            _outUrl = ngImagoAttributeParser.parseUrl($elements[i].url, attrs, options);
                            break;
                        }
                    }

                    _sizes = null;
                    $elements = null;

                    return _outUrl;

                } else {
                    return "";
                }
            };

            ngImagoAttributeParser.parseUrl = function(imageUrl, attrs, options) {
                var _outUrl = "";

                if (imageUrl.indexOf(",") > -1) {
                    var $elements_split = imageUrl.split(",");
                    angular.forEach($elements_split, function(img) {
                        if (ngImagoAttributeParser.pixelRatio > 1 && img.indexOf('@2x') > -1) {
                            _outUrl = img;
                        } else if (ngImagoAttributeParser.pixelRatio === 1) {
                            _outUrl = img;
                        }
                    });
                } else {
                    _outUrl = imageUrl;
                }

                if (is_portrait && options && getSetting('portrait', options) === true) {
                    var ext = _outUrl.substr(_outUrl.lastIndexOf('.'));
                    var path = _outUrl.substr(0, _outUrl.lastIndexOf('.'));
                    _outUrl = path + getSetting('portrait_suffix', options) + ext;
                }

                return _outUrl;
            };

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

            $rootScope.$on(EVENT_IMG_LOADED, function(event, data) {

                ngImagoService.remove(data);
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

                //console.log("add", ngImagoService.queue, obj);

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
                    if (!indexGroup || !indexGroup.items || indexGroup.items.length === 0) {
                        return false;
                    } else {
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

            ngImagoService.remove = function(obj) {


                if (angular.isUndefined(obj)) {
                    return;
                }

                var thisIndex = obj.index;

                var indexGroup = ngImagoService.indexExists(obj.index);

                var item = ngImagoService.itemExists(indexGroup.items, obj, true);
                if (!item) {
                    return;
                }

                //console.log(ngImagoService.queue.length, indexGroup.items.length, ngImagoService.queue, obj.index, ngImagoService.currIndex);


                if (indexGroup && indexGroup.items.length === 0) {

                    ngImagoService.removeQueueIndex(indexGroup.index);

                    $rootScope.$broadcast(EVENT_IMG_QUEUE_INDEX_COMPLETE, ngImagoService.currIndex);

                    // reaching the next available loading index in the queue
                    // we could have 0... 1... 4 
                    for (var i = 0; i < ngImagoService.queue.length; i++) {
                        if (ngImagoService.queue[i] && ngImagoService.queue[i].items && ngImagoService.queue[i].items.length > 0) {
                            ngImagoService.currIndex = ngImagoService.queue[i].index;
                            break;
                        }
                    }

                    //console.log("remove",ngImagoService.queue.length, indexGroup.items.length, ngImagoService.queue, obj.index, ngImagoService.currIndex);



                    if (ngImagoService.queue.length === 0) {
                        $rootScope.$broadcast(EVENT_IMG_QUEUE_COMPLETE, thisIndex);
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

                    $scope.loaded = false;
                    $scope.source = "";
                    $scope.options = {};

                    var _initialize = false;

                    var _request_load_listener, _watch_attrs_fn, _watch_resp_fn;

                    if (!angular.isUndefined($attrs.src)) {
                        $log.error("[ngImagoModule] -> You can't use ngImagoMng module with 'src' attribute in the <img> tag. Remove src='" + $attrs.src + "'");
                    }

                    // shortcut 
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

                            ngImagoService.itemExists(null, {
                                index: $scope.options.queue_index,
                                url: $scope.options.source_to_set
                            }, true);

                        }

                        setOptions();

                        _initialize = true;

                        $scope.options.auto_load = $attrs.autoLoad === "false" ? false : true;
                        $scope.options.queue_index = angular.isUndefined($attrs.queueIndex) ? 0 : Number($attrs.queueIndex);


                        if (calcUrl() === false) {
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

                        //console.log("onLoadImgRequest", canLoad, canLoadIndex, canQueue, data, $scope.options);

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
                            index: $scope.options.queue_index,
                            elem: $element
                        });
                    };

                    $scope.onImageLoad = function() {

                        $element.off("load", $scope.onImageLoad);
                        $element.off("error", $scope.onImageError);

                        $scope.loaded = true;

                        $element.removeClass(_getSetting('loading_class'));
                        $element.addClass(_getSetting('loaded_class'));

                        if ($scope.options.unbind_when_loaded && _request_load_listener) {
                            _request_load_listener();
                            _watch_attrs_fn();
                        }


                        $rootScope.$broadcast(EVENT_IMG_LOADED, {
                            url: $scope.options.source_to_set,
                            index: $scope.options.queue_index
                        });
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

                    $rootScope.$on(EVENT_WINDOW_RESIZE, function() {

                        if (_initialize) {
                            startLoadImage(true, ($scope.options.auto_load || $scope.loaded)); // TODO params
                        }

                    });

                    _watch_attrs_fn = $scope.$watch(function() {
                        return [$element.attr('auto-load'), $element.attr('queue-index')];
                    }, function(nv, ov) {

                        if (_initialize) {

                            $attrs.autoLoad = nv[0];
                            $attrs.queueIndex = nv[1];
                            // TODO remove from queue old url
                            //console.log("_watch_attrs_fn", $attrs)
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
                        if (_initialize) {
                            //console.log(nv);
                            $attrs.small = nv[0];
                            $attrs.medium = nv[1];
                            $attrs.large = nv[2];
                            $attrs.xlarge = nv[3];
                            // TODO remove from queue old url
                            startLoadImage(true, $scope.options.auto_load || $scope.loaded);

                        } else {

                            init();
                        }
                    }, true);


                    // add listener only once
                    if (!resize_initialized) {
                        window_w = $window.innerWidth;
                        window_h = $window.innerHeight;
                        is_portrait = window_h > window_w;

                        $window.onresize = function() {
                            window_w = $window.innerWidth;
                            window_h = $window.innerHeight;
                            is_portrait = window_h > window_w;
                            // TODO set a debounce
                            $rootScope.$broadcast(EVENT_WINDOW_RESIZE);
                        };

                        resize_initialized = true;
                    }

                },
                link: function($scope, iElement, iAttrs, controller) {



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
                        // TODO param windows or parent
                        var scaleMode = getSetting('scale', _options);
                        var center = getSetting('center', _options);

                        // TODO allow other methods to select the parent
                        if (scaleMode === "cover" || scaleMode === "fit" || center === true) {

                            var container = getSetting('container', _options);

                            var tW = $element[0].width,
                                tH = $element[0].height;

                            if (container === "parent") {
                                var parent = $element.parent();
                                if (parent && parent.length > 0 && parent[0].width && parent[0].height) {
                                    tW = parent[0].width;
                                    tH = parent[0].height;
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
                },
                link: function($scope, $element, $attrs, controller) {


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