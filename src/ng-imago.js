/*
 * ng-img-manager
 * https://github.com/panurge-ws/ng-imgmanager
 *
 * Copyright (c) 2014 Panurge Web Studio
 * Licensed under the MIT license.
 */

/*global window */
(function(angular, undefined) {

    'use strict';

    // @private
    // defaults
    var _defaults_options = {
        mobile_width: 320,
        tablet_min_width: 768,
        desktop_min_width: 1280,
        portrait: false,
        portrait_suffix: "-portrait",
        force_redownload: true,
        loaded_class: "ng-imago-loaded",
        loading_class: "ng-imago-loading",
        error_class: "ng-imago-error"
    };


    // internal
    var _resize_initialized = false,
        _window_w = 0,
        _window_h = 0,
        _is_portrait = false;

    // Events
    var EVENT_IMG_LOADED = "$ngImagoImageLoaded",
        EVENT_IMG_ERROR = "$ngImagoImageError",
        EVENT_IMG_LOAD_REQUEST = "$ngImagoLoadRequest",
        EVENT_IMG_QUEUE_INDEX_COMPLETE = "$ngImagoQueueIndexComplete",
        EVENT_IMG_QUEUE_COMPLETE = "$ngImagoLoadQueueComplete",
        EVENT_WINDOW_RESIZE = "$ngImagoWindowResize";

    var ngImago = angular.module('ngImago', []);

    ngImago.provider('ngImagoProvider', [

        function() {

            this.setDefaults = function(value) {
                
                if (!angular.isUndefined(value) && value !== '') {
                    for (var prop in _defaults_options) {
                        if (!angular.isUndefined(value[prop])) {
                            _defaults_options[prop] = value[prop];
                        }
                    }   
                } 
            };

            this.$get = angular.noop;

        }
    ]);

    ngImago.service('ngImagoAttributeParser', ["$window",

        function($window) {

            var ngImagoAttributeParser = {};


            ngImagoAttributeParser.pixelRatio = $window.devicePixelRatio ? $window.devicePixelRatio : 1;

            ngImagoAttributeParser.getUrlForAttrs = function(attrs, options) {

                var sizes = [{
                    size: "mobile",
                    min_width: options.mobile_width
                }, {
                    size: "tablet",
                    min_width: options.tablet_min_width
                }, {
                    size: "desktop",
                    min_width: options.desktop_min_width
                }, {
                    size: "xdesktop",
                    min_width: options.desktop_min_width + 1
                }];

                var _images = [];
                for (var i = 0; i < sizes.length; i++) {
                    if (!angular.isUndefined(attrs[sizes[i].size])) {
                        _images.push({
                            url: attrs[sizes[i].size],
                            min_width: sizes[i].min_width
                        });
                    }
                }

                if (_images.length > 0) {

                    // sort by min_width
                    _images = _images.sort(function(a, b) {
                        return a.min_width - b.min_width;
                    });

                    var _url_to_set = "";
                    _url_to_set = ngImagoAttributeParser.parseUrl(_images[_images.length - 1].url, attrs, options); // set the larger available

                    // loop to find if there is a smaller image to load
                    for (i = 0; i < _images.length; i++) {
                        if (_window_w <= _images[i].min_width) {
                            _url_to_set = ngImagoAttributeParser.parseUrl(_images[i].url, attrs, options);
                            break;
                        }
                    }

                    return _url_to_set;
                } else {
                    return "";
                }
            };

            ngImagoAttributeParser.parseUrl = function(imageUrl, attrs, options) {
                var _outUrl = "";

                if (imageUrl.indexOf(",") > -1) {
                    var _images_split = imageUrl.split(",");
                    angular.forEach(_images_split, function(img) {
                        if (ngImagoAttributeParser.pixelRatio > 1 && img.indexOf('@2x') > -1) {
                            _outUrl = img;
                        } else if (ngImagoAttributeParser.pixelRatio === 1) {
                            _outUrl = img;
                        }
                    });
                } else {
                    _outUrl = imageUrl;
                }

                if (_is_portrait && options && options.portrait === true) {
                    var ext = _outUrl.substr(_outUrl.lastIndexOf('.'));
                    var path = _outUrl.substr(0, _outUrl.lastIndexOf('.'));
                    _outUrl = path + options.portrait_suffix + ext;
                }

                return _outUrl;
            };

            return ngImagoAttributeParser;
        }
    ]);

    ngImago.service('ngImagoService', ['$rootScope',
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

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, index, 'index');
            };

            ngImagoService.loadGroup = function(groupName) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, groupName, 'group');
            };

            ngImagoService.loadImageById = function(id) {

                $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, id, 'id');
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

                var indexGroup = ngImagoService.indexExists(obj.index);

                var item = ngImagoService.itemExists(indexGroup.items, obj, true);
                if (!item) {
                    return;
                }

                if (indexGroup && indexGroup.items.length === 0) {

                    ngImagoService.removeQueueIndex(indexGroup.index);

                    $rootScope.$broadcast(EVENT_IMG_QUEUE_INDEX_COMPLETE, ngImagoService.currIndex);

                    // reaching the next available loading index in the queue
                    // we could have 0... 1... 4 
                    for (var i = 0; i < ngImagoService.queue.length; i++) {
                        if (ngImagoService.queue[i]) {
                            ngImagoService.currIndex = ngImagoService.queue[i].index;
                            break;
                        }
                    }

                    $rootScope.$broadcast(EVENT_IMG_LOAD_REQUEST, ngImagoService.currIndex);

                    if (ngImagoService.queue.length === 0) {
                        $rootScope.$broadcast(EVENT_IMG_QUEUE_COMPLETE, ngImagoService.currIndex);
                    }
                }
            };

            return ngImagoService;

        }
    ]);

    /// DIRECTIVE ///

    ngImago.directive('ngImago', ['ngImagoService', 'ngImagoAttributeParser', '$rootScope', '$window', '$log',
        function(ngImagoService, ngImagoAttributeParser, $rootScope, $window, $log) {

            return {
                priority: 950, // set to 1000 so ImageResize loader can execute after
                //replace:true,
                scope: true,
                restrict: 'A',
                link: function($scope, iElement, iAttrs, controller) {

                    var _image = iElement;

                    var _url_to_set = "";
                    var _loaded = false;
                    var _initialize = false;
                    var _last_loaded_url = "";
                    var _loading_url = "";

                    // map options to defaults
                    var _options;
                    if (angular.isUndefined(iAttrs.ngImago) || iAttrs.ngImago === '') {
                        _options = _defaults_options;
                    } else {

                        _options = $scope.$eval(iAttrs.ngImago);

                        for (var prop in _defaults_options) {
                            if (angular.isUndefined(_options[prop])) {
                                _options[prop] = _defaults_options[prop];
                            }
                        }
                    }

                    //console.log(_options)

                    var _auto_load = $scope.autoLoad === false ? false : true;
                    var _queue_index = angular.isUndefined(iAttrs.queueIndex) ? -1 : iAttrs.queueIndex;
                    var _load_group = angular.isUndefined(iAttrs.loadGroup) ? "default" : iAttrs.loadGroup;

                    //console.log(_options.portrait, _load_group, _auto_load);

                    if (!angular.isUndefined(iAttrs.src)) {
                        $log.error("[ngImagoModule] -> You can't use ngImagoMng module with 'src' attribute in the <img> tag. Remove src='" + iAttrs.src + "'");
                    }

                    function init() {

                        _url_to_set = ngImagoAttributeParser.getUrlForAttrs(iAttrs, _options);

                        if (_url_to_set === "") {
                            $log.error("[ngImagoModule] -> no-url-for-image", iAttrs);
                            return;
                        }

                        if (_loading_url === _url_to_set) {
                            return;
                        }

                        if (_loading_url !== "") {
                            ngImagoService.remove({
                                index: _queue_index,
                                url: _loading_url
                            });
                        }

                        ngImagoService.add({
                            index: _queue_index,
                            url: _url_to_set
                        });

                        _loading_url = _url_to_set;

                        if (_queue_index === -1 && _auto_load === true) {
                            startLoadImage(false, _auto_load);
                        } else if (_queue_index > -1 || _auto_load === false) {

                            $rootScope.$on(EVENT_IMG_LOAD_REQUEST, onLoadImgRequest);

                        }

                        _initialize = true;
                    }

                    function onLoadImgRequest(ev, data, type) {

                        if (angular.isUndefined(data)) {
                            return;
                        }

                        if ((_queue_index === data || data === "all") && _auto_load === true) {
                            startLoadImage(false, true);
                        } else if (_auto_load === false) // we load only on demand
                        {
                            var canLoad = false;

                            if (type && type === "group" && data === _load_group) {
                                canLoad = true;
                            }
                            if (type && type === "id" && data === iElement.attr('id')) {
                                canLoad = true;
                            }
                            if (type && type === "index" && _queue_index === data) {
                                canLoad = true;
                            }

                            //console.log(data, type, canLoad)

                            if (canLoad) {
                                startLoadImage(false, true);
                            }
                        }

                    }

                    function onImageError() {

                        _image.off("load", onImageLoad);
                        _image.off("error", onImageError);

                        _loaded = true;

                        $log.error("[ngImagoModule] -> error loading URL", _url_to_set);

                        _image.removeClass(_options.loading_class);
                        _image.addClass(_options.error_class);

                        $rootScope.$broadcast(EVENT_IMG_ERROR, {
                            url: _url_to_set,
                            index: _queue_index
                        });
                    }

                    function onImageLoad() {

                        _image.off("load", onImageLoad);
                        _image.off("error", onImageError);

                        _loaded = true;

                        _last_loaded_url = _url_to_set;

                        _image.removeClass(_options.loading_class);
                        _image.addClass(_options.loaded_class);

                        $rootScope.$broadcast(EVENT_IMG_LOADED, {
                            url: _url_to_set,
                            index: _queue_index
                        });
                    }

                    function startLoadImage(recalcURL, forceLoad) {

                        if (recalcURL === true) {
                            _url_to_set = ngImagoAttributeParser.getUrlForAttrs(iAttrs, _options);

                            if (_url_to_set === "") {
                                $log.error("[ngImagoModule] -> no-url-for-image", iAttrs);
                                return;
                            }

                            if (_loading_url === _url_to_set) {
                                return;
                            }
                        }

                        if (!_auto_load && forceLoad !== true) {
                            return;
                        }

                        if (_loaded) {
                            _image.removeClass(_options.error_class);
                            _image.removeClass(_options.loaded_class);
                        }
                        _image.addClass(_options.loading_class);

                        _image.on("load", onImageLoad);
                        _image.on("error", onImageError);

                        _loading_url = _url_to_set;

                        _loaded = false;

                        //console.log("_url_to_set", _url_to_set);
                        imageSetSource(_image, _options.force_redownload, _url_to_set);

                    }

                    function imageSetSource(image, force_redownload, url_to_set) {
                        if (force_redownload) {
                            image.attr("src", url_to_set + "?c=" + Math.round(Math.random() * 100000));
                        } else {
                            image.attr("src", url_to_set);
                        }
                    }

                    $rootScope.$on(EVENT_WINDOW_RESIZE, function() {
                        if (_initialize) {
                            startLoadImage(true, (_auto_load || _loaded)); // TODO params
                        }
                    });

                    $scope.$watch(function() {
                        return [iElement.attr('mobile'), iElement.attr('tablet'), iElement.attr('desktop'), iElement.attr('xdesktop'), iElement.attr('queue-index')];
                    }, function(nv, ov) {
                        if (_initialize) {
                            //console.log(nv);
                            iAttrs.mobile = nv[0];
                            iAttrs.tablet = nv[1];
                            iAttrs.desktop = nv[2];
                            iAttrs.xdesktop = nv[3];
                            iAttrs.queueIndex = nv[4];
                            // TODO remove from queue old url
                            startLoadImage(true, _auto_load);
                        } else {
                            init();
                        }
                    }, true);

                    // add listener only once
                    if (!_resize_initialized) {
                        _window_w = $window.innerWidth;
                        _window_h = $window.innerHeight;
                        _is_portrait = _window_h > _window_w;

                        $window.onresize = function() {
                            _window_w = $window.innerWidth;
                            _window_h = $window.innerHeight;
                            _is_portrait = _window_h > _window_w;
                            // TODO set a debounce
                            $rootScope.$broadcast(EVENT_WINDOW_RESIZE);
                        };

                        _resize_initialized = true;
                    }

                }

            };

        }
    ]);




    /*ngImago.directive('ngMultiresSource', ['ngImagoAttributeParser',
        function(ngImagoAttributeParser) {

            var directiveDefinitionObject = {
                link: function($scope, iElement, iAttrs, controller) {

                    var $video = $(iElement);

                    var video_sources = ngImagoAttributeParser.getUrlForAttrs(iAttrs);
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

    ngImago.directive('ngMultiresBkg', ['ngImagoAttributeParser',
        function(ngImagoAttributeParser) {

            var directiveDefinitionObject = {
                link: function($scope, iElement, iAttrs, controller) {

                    var urls = angular.fromJson(iAttrs.ngMultiresBkg); // we expect here a json string

                    var sizes = [{
                        size: "small",
                        min_width: _mobile_width
                    }, {
                        size: "medium",
                        min_width: _tablet_min_width
                    }, {
                        size: "large",
                        min_width: _desktop_min_width
                    }, {
                        size: "xlarge",
                        min_width: _desktop_min_width + 1
                    }];

                    var url_to_set = ngImagoAttributeParser.getUrlForAttrs(urls);

                    if (url_to_set != "")
                        $(iElement).css({
                            backgroundImage: "url(" + url_to_set + ")"
                        });

                }

            }

            return directiveDefinitionObject;

        }
    ]);*/

})(window.angular);
