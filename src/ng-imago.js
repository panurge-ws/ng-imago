/*
 * ng-imago
 * https://github.com/panurge-ws/ng-imago
 *
 * Copyright (c) 2014 Panurge Web Studio
 * Licensed under the MIT license.
 */

/*global window */
/*global jQuery */
/*global console */
/*global matchMedia */
/*global Image */
/*global $ */
( function( angular, undefined ) {

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
        scale: 'contain', // [contain | cover]
        // Center the image
        center: true, // center inside the container
        // The container type to scale and/or center the image
        container: 'parent', // ["parent" | "window"]
        // set the loading/loaded/error class also on parent (if exists)
        parent_classes: true
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
            query: 'only screen and (min-width: 1440px)'
        }
    ];

    var utilsQueries = {
        'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), ' +
            'only screen and (min--moz-device-pixel-ratio: 2), ' +
            'only screen and (-o-min-device-pixel-ratio: 2/1), ' +
            'only screen and (min-device-pixel-ratio: 2), ' +
            'only screen and (min-resolution: 192dpi), ' +
            'only screen and (min-resolution: 2dppx)',
        'portrait': 'only screen and (orientation: portrait)'
    };

    var resize_initialized = false;

    if ( angular.isUndefined( matchMedia ) ) {
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

    var ngImagoModule = angular.module( 'ngImago', [] );

    ngImagoModule.provider( 'ngImago', [

        function() {

            this.defaultsSettings = function( value ) {

                if ( !angular.isUndefined( value ) ) {
                    if ( value !== '' ) {
                        for ( var prop in default_settings ) {
                            if ( !angular.isUndefined( value[ prop ] ) ) {
                                default_settings[ prop ] = value[ prop ];
                            }
                        }
                    }
                } else {
                    return default_settings;
                }

            };

            this.defaultsSizes = function( value ) {

                if ( !angular.isUndefined( value ) ) {
                    if ( value !== '' ) {
                        for ( var prop in default_sizes ) {
                            if ( !angular.isUndefined( value[ prop ] ) ) {
                                default_sizes[ prop ] = value[ prop ];
                            }
                        }
                    }
                } else {
                    return default_sizes;
                }

            };

            this.addDefaultSize = function( attr, query ) {

                default_sizes.push( {
                    "attr": attr,
                    "query": query
                } );

            };

            this.changeDefaultSize = function( attr, query ) {
                for ( var i = default_sizes.length - 1; i >= 0; i-- ) {
                    if ( default_sizes[ i ].attr === attr ) {
                        default_sizes[ i ].attr = query;
                    }
                }
            };

            this.removeDefaultSize = function( attr ) {
                for ( var i = default_sizes.length - 1; i >= 0; i-- ) {
                    if ( default_sizes[ i ].attr === attr ) {
                        default_sizes.splice( i, 1 );
                        break;
                    }
                }
            };

            this.$get = angular.noop;

        }
    ] );

    ngImagoModule.service( 'ngImagoAttributeParser', [ "$window", "$log", "$rootScope",

        function( $window, $log, $rootScope ) {

            var ngImagoAttributeParser = {};

            ngImagoAttributeParser.mediaQueries = [];

            ngImagoAttributeParser.calculateUrl = function( sources, options ) {


                var source = ngImagoAttributeParser.getUrlForSources( sources, options );

                if ( source === "" ) {
                    $log.warn( "[ngImagoModule] -> no-url-for-image", sources );
                    return false;
                }

                if (getSetting( 'avoid_cache', options ) === true){

                    if (source.indexOf('?') > -1){
                        source += "&c=" + ( Math.random() * 100000 ).toString();
                    }
                    else{
                        source += "?c=" + ( Math.random() * 100000 ).toString();
                    }
                    
                }
                
                return source;
            };

            ngImagoAttributeParser.getUrlForSources = function( sources, options ) {

                var attrMatching = null,
                    defaultAttr = null;

                for ( var attr in sources ) {

                    if ( !angular.isUndefined( sources[ attr ] ) ) {


                        var attrClean = attr.replace( 'Portrait', '' );
                        var searchPortrait = attr.indexOf( "Portrait" ) > -1;

                        var requestQuerySet = _getQuerySetByAttr( attrClean );

                        //console.log(sources, attr, requestQuerySet)

                        if ( requestQuerySet != null ) {
                            var query = "";

                            if ( !angular.isUndefined( options[ attr ] ) ) {
                                query = options[ attr ];

                            } else {
                                query = requestQuerySet.query;
                            }

                            var mediaQueryRequested = _mediaQueryExists( query );

                            if ( mediaQueryRequested === false ) {
                                mediaQueryRequested = _addMediaQuery( query );

                            }

                            //console.log("attr",mediaQueryRequested.media,mediaQueryRequested.matches)

                            if ( searchPortrait ) {

                                if ( mediaQueryRequested.matches && ngImagoAttributeParser.portraitQuery.matches ) {
                                    attrMatching = sources[ attr ];
                                } else if ( attrMatching == null ) {
                                    defaultAttr = sources[ attr ];
                                }
                            } else {

                                if ( mediaQueryRequested.matches ) {
                                    attrMatching = sources[ attr ];
                                } else if ( attrMatching == null ) {
                                    defaultAttr = sources[ attr ];
                                }
                            }

                        }
                    }

                }

                // try to load at leat a source...
                if ( attrMatching === null && defaultAttr !== null ) {
                    attrMatching = defaultAttr;
                }

                if ( attrMatching === null || angular.isUndefined( attrMatching ) ) {
                    return "";
                } else {
                    return ngImagoAttributeParser.parseAttr( attrMatching, sources, options );
                }

            };

            ngImagoAttributeParser.mediaQueryHandler = function( mq ) {
                $rootScope.$broadcast( EVENT_MEDIA_QUERY_CHANGED, mq );
            };

            var _addMediaQuery = function( query ) {
                var mq = matchMedia( query );
                mq.addListener( ngImagoAttributeParser.mediaQueryHandler );
                ngImagoAttributeParser.mediaQueries[ query ] = mq;
                return ngImagoAttributeParser.mediaQueries[ query ];
            };

            var _removeMediaQuery = function( query ) {
                // TODO, remove overriding media queries not used
            };

            var _mediaQueryExists = function( query ) {
                if ( angular.isUndefined( ngImagoAttributeParser.mediaQueries[ query ] ) ) {
                    return false;
                } else {
                    return ngImagoAttributeParser.mediaQueries[ query ];
                }
            };

            var _getQuerySetByAttr = function( attr ) {
                for ( var i = 0; i < default_sizes.length; i++ ) {
                    if ( default_sizes[ i ].attr === attr ) {
                        return default_sizes[ i ];
                    }
                }
                return null;
            };

            var _getQuerySetByQuery = function( query ) {
                for ( var i = 0; i < default_sizes.length; i++ ) {
                    if ( default_sizes[ i ].query === query ) {
                        return default_sizes[ i ];
                    }
                }
                return null;
            };


            ngImagoAttributeParser.parseAttr = function( imageUrl, sources, options ) {
                var _outUrl = "";

                if ( imageUrl.indexOf( "," ) > -1 ) {
                    var _images_split = imageUrl.split( "," );
                    angular.forEach( _images_split, function( img ) {
                        if ( ngImagoAttributeParser.isRetina === true && img.indexOf( '@2x' ) > -1 ) {
                            _outUrl = img;
                        } else if ( ngImagoAttributeParser.isRetina === false && img.indexOf( '@2x' ) === -1) {
                            _outUrl = img;
                        }
                    } );
                    // safly catch the first one
                    if (_outUrl === ''){
                        _outUrl = _images_split[0];
                    }
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
            ngImagoAttributeParser.isRetina = matchMedia( utilsQueries.retina ).matches;
            ngImagoAttributeParser.portraitQuery = _addMediaQuery( utilsQueries.portrait );

            return ngImagoAttributeParser;
        }
    ] );

    ngImagoModule.service( 'ngImagoService', [ '$rootScope',

        function( $rootScope ) {

            var ngImagoService = {};

            ngImagoService.loadQueueIndex = function( index ) {

                $rootScope.$broadcast( EVENT_IMG_LOAD_REQUEST, {
                    type: 'queueIndex',
                    index: index
                } );
            };

            ngImagoService.loadByAttribute = function( attrName, attrValue ) {

                $rootScope.$broadcast( EVENT_IMG_LOAD_REQUEST, {
                    type: 'attr',
                    name: attrName,
                    value: attrValue,
                    index: 0
                } );
            };

            ngImagoService.loadByClass = function( className ) {

                $rootScope.$broadcast( EVENT_IMG_LOAD_REQUEST, {
                    type: 'class',
                    class: className,
                    index: 0
                } );
            };

            ngImagoService.loadImageById = function( id ) {

                $rootScope.$broadcast( EVENT_IMG_LOAD_REQUEST, {
                    type: 'id',
                    id: id,
                    index: 0
                } );
            };

            return ngImagoService;

        }
    ] );

    ngImagoModule.service( 'ngImagoQueue', [ '$rootScope',

        function( $rootScope ) {

            var ngImagoQueue = {};

            ngImagoQueue.queue = [];
            ngImagoQueue.currIndex = -1;
            ngImagoQueue.perc = 0;
            ngImagoQueue.perc_items = 0;

            $rootScope.$on( EVENT_IMG_LOADED, function( event, data, element ) {
                ngImagoQueue.remove( data, element );
            } );

            $rootScope.$on( EVENT_IMG_ERROR, function( event, data, element ) {
                ngImagoQueue.remove( data );
            } );

            ngImagoQueue.add = function( obj ) {

                var indexGroup = ngImagoQueue.indexExists( obj.index );
                if ( !indexGroup ) {
                    indexGroup = {
                        index: obj.index,
                        items: []
                    };
                    ngImagoQueue.queue.push( indexGroup );
                }

                if ( ngImagoQueue.itemExists( indexGroup.items, obj ) ) {
                    return;
                }

                indexGroup.items.push( obj );

                ngImagoQueue.queue.sort( function( a, b ) {
                    return a.index - b.index;
                } );

            };

            ngImagoQueue.indexExists = function( index, andRemove ) {

                if ( !ngImagoQueue.queue || ngImagoQueue.queue.length === 0 ) {
                    return false;
                }

                for ( var i = ngImagoQueue.queue.length - 1; i >= 0; i-- ) {
                    if ( ngImagoQueue.queue[ i ].index === index ) {
                        if ( andRemove === true ) {
                            return ngImagoQueue.queue.splice( i, 1 );
                        } else {
                            return ngImagoQueue.queue[ i ];
                        }
                    }
                }

                return false;
            };

            ngImagoQueue.itemExists = function( dict, obj, andRemove ) {

                if ( dict === null ) {
                    var indexGroup = ngImagoQueue.indexExists( obj.index );
                    if ( indexGroup && indexGroup.items && indexGroup.items.length > 0 ) {
                        dict = indexGroup.items;
                    }
                }

                if ( !dict || dict.length === 0 ) {
                    return false;
                }

                for ( var i = dict.length - 1; i >= 0; i-- ) {
                    if ( dict[ i ].url === obj.url ) {
                        if ( andRemove === true ) {
                            return dict.splice( i, 1 );
                        } else {
                            return dict[ i ];
                        }
                    }
                }

                return false;
            };

            ngImagoQueue.removeQueueIndex = function( index ) {

                if ( !ngImagoQueue.queue || ngImagoQueue.queue.length === 0 ) {
                    return false;
                }

                for ( var i = ngImagoQueue.queue.length - 1; i >= 0; i-- ) {
                    if ( ngImagoQueue.queue[ i ].index === index ) {
                        return ngImagoQueue.queue.splice( i, 1 );
                    }
                }

                return false;
            };

            ngImagoQueue.remove = function( obj, element ) {


                if ( angular.isUndefined( obj ) ) {
                    return;
                }

                var thisIndex = obj.index;

                var indexGroup = ngImagoQueue.indexExists( obj.index );

                var item = ngImagoQueue.itemExists( indexGroup.items, obj, true );


                if ( indexGroup && indexGroup.items.length === 0 ) {

                    ngImagoQueue.removeQueueIndex( indexGroup.index );

                    $rootScope.$broadcast( EVENT_IMG_QUEUE_INDEX_COMPLETE, thisIndex, obj, element );

                    for ( var i = 0; i < ngImagoQueue.queue.length; i++ ) {
                        if ( ngImagoQueue.queue[ i ] && ngImagoQueue.queue[ i ].items && ngImagoQueue.queue[ i ].items.length > 0 ) {
                            ngImagoQueue.currIndex = ngImagoQueue.queue[ i ].index;
                            break;
                        }
                    }

                    if ( ngImagoQueue.queue.length === 0 ) {
                        $rootScope.$broadcast( EVENT_IMG_QUEUE_COMPLETE, thisIndex, obj, element );
                    } else {
                        $rootScope.$broadcast( EVENT_IMG_LOAD_REQUEST, {
                            type: "index",
                            index: ngImagoQueue.currIndex
                        } );
                    }

                }
            };

            return ngImagoQueue;

        }
    ] );



    /// DIRECTIVE ///


    ngImagoModule.directive( 'ngImago', [ 'ngImagoQueue', 'ngImagoAttributeParser', '$rootScope', '$log',
        function( ngImagoQueue, ngImagoAttributeParser, $rootScope, $log ) {

            /*var scopeObject = {
                autoLoad:"@",
                queueIndex:"@",
                override:"@",
                sources:"@",
            };

            for (var i = 0; i < default_sizes.length; i++) {
                scopeObject[default_sizes[i].attr] = "@";
            };*/

            return {
                //priority: 950, // TODO test with other directive if there are confilcts
                scope: {},
                restrict: 'EA',
                controller: [ "$scope", "$element", "$attrs",
                    function( $scope, $element, $attrs ) {

                        // @ public

                        // flags
                        $scope.loaded = false;
                        $scope.initialized = false;

                        // this is the actual value of the "src" attribute
                        // $scope.options.source_to_set is the promised value of the same attribute
                        $scope.source = "";

                        // an object with options passed to ng-imago=""; 
                        // it's used to override default options
                        $scope.options = {};

                        // the sources set in the directive
                        // can be either a list of attributes or a single object 
                        // passed to sources=""
                        $scope.sourcesSet = {};


                        // stores the type of the element [img|anything else(a, div, span, ecc.)]
                        // if we have <img> tag we load it directy the with the "src" prop
                        // otherwise we set the backgroung-image style
                        $scope.elementType = "";


                        // utility function: used externally by other modules
                        $scope.load = function( forceRecalcUrl ) {
                            if ( !$scope.initialized ) {
                                init();
                            }
                            startLoadImage( forceRecalcUrl, true );
                        };

                        // @public API
                        this.isLoaded = function() {
                            return $scope.loaded;
                        };

                        this.getOptions = function() {
                            return $scope.options;
                        };

                        this.getSource = function() {
                            return $scope.source;
                        };

                        this.getSourcesSet = function() {
                            return $scope.sourcesSet;
                        };

                        this.getElementType = function() {
                            return $scope.elementType;
                        };

                        // @ private

                        var _image,
                            _request_load_listener,
                            _watch_attrs_fn,
                            _watch_resp_fn,
                            _source_type;

                        // calculate suddenly these values
                        // these can be available to other directives of the modules

                        if ( $element[ 0 ].tagName.toUpperCase() === "IMG" ) {
                            $scope.elementType = "IMG";
                            _image = $element;
                        } else {
                            $scope.elementType = "NO-IMG";
                            _image = angular.element( new Image() );
                        }

                        // check if src is empty
                        if ( !angular.isUndefined( $attrs.src ) ) {
                            $log.error( "[ngImagoModule] -> You can't use ngImagoMng module with 'src' attribute in the <img> tag. Remove src='" + $attrs.src + "'" );
                        }

                        function init() {


                            if ( $scope.options && $scope.options.source_to_set && $scope.options.source_to_set !== "" ) {

                                // remove from the queue if a url was added before
                                ngImagoQueue.itemExists( null, {
                                    index: $scope.options.queue_index,
                                    url: $scope.options.source_to_set
                                }, true );

                            }

                            setOptions();


                            $scope.initialized = true;

                            $scope.options.auto_load = $attrs.autoLoad === "false" ? false : true;

                            $scope.options.queue_index = angular.isUndefined( $attrs.queueIndex ) ? 0 : Number( $attrs.queueIndex );
                            $scope.options.source_to_set = ngImagoAttributeParser.calculateUrl( $scope.sourcesSet, $scope.options );

                            if ( $scope.options.source_to_set === false ) { // no resource has been found
                                return;
                            }
                            // avoid reset the same src
                            if ( $scope.source === $scope.options.source_to_set ) {
                                return;
                            }

                            if ( $scope.options.auto_load === true ) {
                                ngImagoQueue.add( {
                                    index: $scope.options.queue_index,
                                    url: $scope.options.source_to_set
                                } );
                            }

                            if ( $scope.options.queue_index < 1 && $scope.options.auto_load === true ) {

                                startLoadImage( false, $scope.options.auto_load );

                            } else if ( $scope.options.queue_index > 0 || $scope.options.auto_load === false ) {

                                _request_load_listener = $rootScope.$on( EVENT_IMG_LOAD_REQUEST, onLoadImgRequest );

                            }


                        }

                        function setOptions() {

                            if ( !angular.isUndefined( $attrs.override ) ) {
                                $scope.options = $attrs.override === "" ? {} : $scope.$eval( $attrs.override );
                            } else {
                                $scope.options = angular.isUndefined( $attrs.ngImago ) || $attrs.ngImago === "" ? {} : $scope.$eval( $attrs.ngImago );
                            }
                            //console.log($scope.options);
                        }

                        function calcUrl() {

                            $scope.options.source_to_set = ngImagoAttributeParser.calculateUrl( $scope.sourcesSet, $scope.options );

                            if ( $scope.options.source_to_set === "" ) {
                                $log.error( "[ngImagoModule] -> no-url-for-image", $attrs );
                                return false;
                            }

                            if ( $scope.source === $scope.options.source_to_set ) {
                                return false;
                            }

                            return $scope.options.source_to_set;
                        }



                        function onLoadImgRequest( ev, data ) {

                            if ( $scope.loaded || angular.isUndefined( data ) ) {
                                return;
                            }


                            var canLoadIndex = $scope.options.queue_index === data.index;
                            var canQueue = false;
                            var canLoad = false;

                            switch ( data.type ) {

                                case 'attr':
                                    var attrName = $attrs.$normalize( data.name );
                                    canQueue = !angular.isUndefined( $attrs[ attrName ] ) && $attrs[ attrName ] === data.value;
                                    break;
                                case 'class':
                                    canQueue = $element.hasClass( data.class );
                                    break;
                                case 'id':
                                    canQueue = $element.attr( 'id' ) === data.id;
                                    break;
                                case 'queueIndex':
                                    canQueue = $scope.options.queue_index === data.index;
                                    break;

                            }

                            var objToQueue = {
                                index: $scope.options.queue_index,
                                url: $scope.options.source_to_set

                            };

                            if ( ( $scope.options.auto_load && canLoadIndex ) ||
                                ( data.type === 'queueIndex' && $scope.options.queue_index === data.index ) ) {
                                canLoad = true;
                            } else if ( canLoadIndex && data.index > 0 ) {
                                canLoad = ngImagoQueue.itemExists( null, objToQueue ) !== false;
                            } else if ( canQueue && $scope.options.queue_index === 0 ) {
                                canLoad = true;
                            }

                            if ( canQueue ) {
                                ngImagoQueue.add( objToQueue );
                            }

                            if ( canLoad ) {
                                startLoadImage( false, true );
                            }
                        }

                        function onImageError( event ) {

                            _image.off( "load", onImageLoad );
                            _image.off( "error", onImageError );

                            $scope.loaded = false;

                            $log.error( "[ngImagoModule] -> error loading URL", $scope.options.source_to_set );

                            var parentEl = $element.parent();

                            if ( _getSetting( 'parent_classes' ) && parentEl ) {
                                parentEl.removeClass( _getSetting( 'loading_class' ) );
                                parentEl.addClass( _getSetting( 'error_class' ) );
                            }

                            $element.removeClass( _getSetting( 'loading_class' ) );
                            $element.addClass( _getSetting( 'error_class' ) );

                            // we go on with the queue even tough error to avoid blocking other images
                            $rootScope.$broadcast( EVENT_IMG_ERROR, {
                                url: $scope.options.source_to_set,
                                index: $scope.options.queue_index
                            }, $element );

                            $scope.$apply();
                        }

                        function onImageLoad( event ) {

                            _image.off( "load", onImageLoad );
                            _image.off( "error", onImageError );

                            $scope.loaded = true;

                            var parentEl = $element.parent();

                            if ( _getSetting( 'parent_classes' ) && parentEl ) {
                                parentEl.removeClass( _getSetting( 'loading_class' ) );
                                parentEl.addClass( _getSetting( 'loaded_class' ) );
                            }

                            $element.removeClass( _getSetting( 'loading_class' ) );
                            $element.addClass( _getSetting( 'loaded_class' ) );

                            if ( _getSetting( 'unbind_when_loaded' ) && _request_load_listener ) {
                                _request_load_listener();
                                _watch_attrs_fn();
                                _watch_resp_fn();
                            }

                            if ( $scope.elementType !== "IMG" ) {
                                $element.css( 'background-image', 'url(' + _image.attr( "src" ) + ')' );
                            }

                            $rootScope.$broadcast( EVENT_IMG_LOADED, {
                                url: $scope.options.source_to_set,
                                index: $scope.options.queue_index,
                            }, $element );

                            $scope.$apply();
                        }

                        function startLoadImage( recalcURL, forceLoad ) {

                            if ( recalcURL === true ) {
                                if ( calcUrl() === false ) {
                                    return;
                                }
                            }

                            if ( !$scope.options.auto_load && forceLoad !== true ) {
                                return;
                            }

                            _image.off( "load", onImageLoad );
                            _image.off( "error", onImageError );

                            var parentEl = $element.parent();

                            if ( $scope.loaded ) {
                                if ( _getSetting( 'parent_classes' ) && parentEl ) {
                                    parentEl.removeClass( _getSetting( 'error_class' ) );
                                    parentEl.addClass( _getSetting( 'loaded_class' ) );
                                }
                                $element.removeClass( _getSetting( 'error_class' ) );
                                $element.removeClass( _getSetting( 'loaded_class' ) );
                            }

                            if ( _getSetting( 'parent_classes' ) && parentEl ) {
                                parentEl.addClass( _getSetting( 'loading_class' ) );
                            }

                            $element.addClass( _getSetting( 'loading_class' ) );

                            _image.on( "load", onImageLoad );
                            _image.on( "error", onImageError );

                            $scope.source = $scope.options.source_to_set;

                            $scope.loaded = false;


                            setSource( $scope.options.source_to_set);

                        }

                        function setSource( source_to_set ) {

                            _image.attr( "src", source_to_set );

                        }


                        // media query change listener
                        $rootScope.$on( EVENT_MEDIA_QUERY_CHANGED, function() {
                            if ( $scope.initialized ) {
                                startLoadImage( true, ( $scope.options.auto_load || $scope.loaded ) );
                            }
                        } );


                        // attributes watchers

                        _watch_attrs_fn = $scope.$watch( function() {
                            return [ $element.attr( 'auto-load' ), $element.attr( 'queue-index' ), $element.attr( 'override' ) ];
                        }, function( nv, ov ) {

                            $attrs.autoLoad = nv[ 0 ];
                            $attrs.queueIndex = nv[ 1 ];
                            $attrs.override = nv[ 2 ];


                            if ( $scope.initialized ) {
                                init();
                            }
                        }, true );


                        _watch_resp_fn = $scope.$watch( function() {

                            var listenerAttr = [ $element.attr( 'sources' ) ];

                            for ( var i = 0; i < default_sizes.length; i++ ) {
                                listenerAttr.push( $element.attr( default_sizes[ i ].attr ) );
                            }

                            return listenerAttr;

                        }, function( nv, ov ) {
                            // use sources if defined
                            if ( !angular.isUndefined( nv[ 0 ] ) ) {
                                $scope.sourcesSet = $scope.$eval( nv[ 0 ] );
                            } else { // use sizes attributes

                                for ( var i = 0; i < default_sizes.length; i++ ) {
                                    $scope.sourcesSet[ default_sizes[ i ].attr ] = nv[ i + 1 ];
                                }
                            }
   
                            // do nothing if still undefined or empty
                            if (angular.isUndefined($scope.sourcesSet) || Object.keys($scope.sourcesSet).length === 0)
                            {
                                return;
                            }
                            
                            if ( $scope.initialized ) {
                                // TODO remove from queue old url
                                startLoadImage( true, $scope.options.auto_load || $scope.loaded );

                            } else {
                                init();
                            }
                        }, true );

                        // shortcut fns 
                        function _getSetting( key ) {
                            return getSetting( key, $scope.options );
                        }

                    }
                ]

            };

        }
    ] );




    ngImagoModule.directive( 'imagoResize', [ "$window", "$rootScope",

        function( $window, $rootScope ) {
            return {

                transclude: true,
                restrict: 'A',
                require: 'ngImago',
                link: function( scope, iElement, iAttrs, controller ) {

                    var _options = angular.isUndefined( iAttrs.imagoResize ) ? {} : scope.$eval( iAttrs.imagoResize );


                    scope.$watch( function() {
                        return controller.isLoaded();
                    }, function( nv, ov ) {
                        if ( nv === true ) {
                            if ( controller.getElementType() === 'NO-IMG' ) {

                                var scaleMode = getSetting( 'scale', _options );
                                var center = getSetting( 'center', _options );

                                if ( scaleMode === "cover" || scaleMode === "contain" ) {
                                    iElement.css( 'background-size', scaleMode );
                                }

                                if ( center === true ) {
                                    iElement.css( 'background-position', 'center center' );
                                }
                            } else {
                                layout();
                            }
                        }
                    } );

                    function layout() {
                        var scaleMode = getSetting( 'scale', _options );
                        var center = getSetting( 'center', _options );

                        // TODO allow other methods to select the parent
                        // TODO save last parent dimensions to avoid recalc on window resizes
                        if ( scaleMode === "cover" || scaleMode === "contain" || center === true ) {

                            var container = getSetting( 'container', _options );

                            var tW = iElement[ 0 ].width,
                                tH = iElement[ 0 ].height;

                            if ( container === "parent" ) {
                                var parent = iElement.parent();
                                if ( parent && parent.length > 0 ) {
                                    var parComW = parseInt( getStyle( parent[ 0 ], "width" ), 10 );
                                    var parComH = parseInt( getStyle( parent[ 0 ], "height" ), 10 );
                                    tW = parComW;
                                    tH = parComH;
                                }

                            } else if ( container === "window" ) {
                                tW = $window.innerWidth;
                                tH = $window.innerHeight;
                            }

                            var new_dim = resizeImageWithRatio( iElement[ 0 ].width, iElement[ 0 ].height, tW, tH, scaleMode, center );

                            iElement[ 0 ].width = new_dim.width;
                            iElement[ 0 ].height = new_dim.height;

                            var position = getStyle( iElement[ 0 ], 'position' );

                            if ( center === true ) {
                                if ( position === "fixed" || position === "absolute" ) {
                                    iElement.css( {
                                        top: new_dim.top + "px",
                                        left: new_dim.left + "px"
                                    } );
                                } else {
                                    iElement.css( {
                                        marginTop: new_dim.top + "px",
                                        marginLeft: new_dim.left + "px"
                                    } );
                                }
                            }
                        }

                        $rootScope.$broadcast( EVENT_IMG_RESIZE, {
                            url: controller.getSource(),
                            elem: iElement,
                        } );

                    }

                    // TODO param windows or parent
                    $rootScope.$on( EVENT_WINDOW_RESIZE, function() {

                        if ( controller.isLoaded() ) {
                            layout();
                        }

                    } );

                    if ( !resize_initialized ) {

                        $window.onresize = function() {
                            // TODO set here a debounce
                            $rootScope.$broadcast( EVENT_WINDOW_RESIZE );
                        };

                        resize_initialized = true;
                    }
                }

            };
        }
    ] );



    // UTILS


    function getStyle( elem, styleProp ) {
        if ( window.jQuery && window.jQuery.fn.css ) {
            return $( elem ).css( styleProp );
        }
        return window.getComputedStyle ? window.getComputedStyle( elem )[ styleProp ] : elem.currentStyle ? elem.currentStyle[ styleProp ] : '';
    }

    function getSetting( key, options ) {

        if ( options && !angular.isUndefined( options[ key ] ) ) {
            return options[ key ];
        } else {
            return default_settings[ key ];
        }
    }

    function resizeImageWithRatio( targetW, targetH, containerW, containerH, mode, isToBeCentered ) {
        var props = {
            width: targetW,
            height: targetH
        };
        var ratio = targetW / targetH;

        if ( mode === "contain" ) {
            if ( containerH / containerW > targetH / targetW ) {
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
        } else if ( mode === "cover" ) {
            if ( containerH / containerW > targetH / targetW ) {
                ratio = targetW / targetH;
                if ( containerH * ratio < containerW ) {
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
                if ( containerW / ratio < containerH ) {
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

        if ( isToBeCentered === true ) {
            props.top = ( containerH - props.height ) / 2;
            props.left = ( containerW - props.width ) / 2;
        }
        return props;
    }


} )( window.angular );
