/**
 * ng.cork.authorization - v0.0.1 - 2015-04-18
 * https://github.com/cork-labs/ng.cork.authorization
 *
 * Copyright (c) 2015 Cork Labs <http://cork-labs.org>
 * License: MIT <http://cork-labs.mit-license.org/2015>
 */
(function (angular) {
    'use strict';

    var module = angular.module('ng.cork.authorization', [
        'ngRoute'
    ]);

    var isString = angular.isString;
    var isObject = angular.isObject;
    var isFunction = angular.isFunction;
    var isArray = angular.isArray;

    function isPromise(value) {
        return !!value && isFunction(value.then);
    }

    function isInjectable(value) {
        return isArray(value) && isFunction(value[value.length - 1]);
    }

    /**
     * Replaces named placeholders
     * @param  {string} text   Text containing named placeholders. Ex: `"The :quick jumps over the :slow"`.
     * @param  {Object} params Object providing values for the parameters. Ex:
     *
     *     {
     *         'quick': 'quick brown fox',
     *         'slow': 'lazy old dog'
     *     }
     *
     * @returns {string} String with placeholders replaced by provided values.
     */
    function interpolate(text, params) {
        return text.replace(/:(\w+)/g, function (match, key) {
            return match.replace(':' + key, params[key]);
        });
    }

    /**
     * @ngdoc service
     * @name ng.cork.authorization.CorkAuthorizationError
     *
     * @description
     * Authorization error object.
     */
    module.factory('CorkAuthorizationError', [
        function CorkAuthorizationErrorFactory() {

            var CorkAuthorizationError = function (redirectPath, $$route) {
                this.redirectPath = redirectPath;
                this.$$route = $$route;
            };

            return CorkAuthorizationError;
        }

    ]);

    /**
     * @ngdoc service
     * @name ng.cork.authorization.corkAuthorizationProvider
     *
     * @description
     * Provides a way to configure the (@link ng.cork.authorization.corkAuthorization corkAuthorization) service and
     * a way to reference this service when defining routes at config time.
     *
     * @property {function} $authorizeRoute When defining routes in the config phase via
     * [$routeProvider.when](https://docs.angularjs.org/api/ngRoute/provider/$routeProvider#when) you
     * can add this function in the `resolve` param to trigger authorization of the route.
     * Ex:
     *
     * <pre>
     * $routeProvider.when('/foo', {
     *     controller: ...
     *     resolve: { authorize: corkAuthorizationProvider.$authorizeRoute },
     *     corkAuthorization: {
     *         rules: [corkAuthorizationProvider.middleware('isAuthenticated')],
     *         redirectPath: '/auth/login'
     *     }
     * });
     * </pre>
     */
    module.provider('corkAuthorization', [
        function corkAuthorizationProvider() {
            var provider = this;

            /**
             * injectable shotcut to corkAuthorization.$authorizeRoute, documented above as property of the provider
             */
            provider.$authorizeRoute = [
                'corkAuthorization',
                function (corkAuthorization) {
                    return corkAuthorization.$authorizeRoute();
                }
            ];

            // -- middlewares

            /**
             * @type {object} stores middleawres
             */
            var middlewares = {};

            /**
             * @ngdoc function
             * @name middleware
             * @methodOf ng.cork.authorization.corkAuthorizationProvider
             *
             * @description
             * Registers or retrieves a middleware.
             *
             * If only a name is provided it will retrieve the middleware or throw an error
             * if the middleware is unkonwn. If an implementation is provided it will store it or throw an
             * error if the middleware is invalid or a middleware with this name was registered before.
             *
             * @param {string} name The middleware name.
             * @param {function|Array} middleware A middleware function or an array defining an injectable function.
             * @returns {*} The requested middleware function|injectable if called with one argumen or the
             * `corkAuthorizationProvider` instance if called with two (for chaining purposes).
             */
            provider.middleware = function (name, middleware) {
                if (!isString(name)) {
                    throw new Error('Invalid corkAuthorization middleware name.');
                }
                if (arguments.length > 1) {
                    if (middlewares[name]) {
                        throw new Error('corkAuthorization middleware "' + name + '" is already registered.');
                    }
                    if (isFunction(middleware) || isInjectable(middleware)) {
                        middlewares[name] = middleware;
                    } else {
                        throw new Error('Invalid corkAuthorization middleware "' + name + '".');
                    }
                    return provider;
                } else {
                    if (!middlewares[name]) {
                        throw new Error('Unknown corkAuthorization middleware "' + name + '".');
                    }
                    return middlewares[name];
                }
            };

            /**
             * @ngdoc service
             * @name ng.cork.authorization.corkAuthorization
             *
             * @description
             * Makes the corkAuthorization service methods available to application controllers and other services.
             *
             * <pre>
             * $routeProvider.when('/foo', {
             *     controller: ...
             *     resolve: { authorize: corkAuthorizationProvider.$authorizeRoute },
             *     corkAuthorization: {
             *         rules: [corkAuthorizationProvider.middleware('isAuthenticated')],
             *         redirectPath: '/auth/login'
             *     }
             * });
             * </pre>
             */

            /**
             * @ngdoc service
             * @name ng.cork.authorization.corkAuthorization
             *
             * @description
             * Makes the corkAuthorization service methods available to application controllers and other services.
             */
            provider.$get = [
                '$rootScope',
                '$q',
                '$location',
                '$route',
                'CorkAuthorizationError',
                function corkAuthorizationFactory($rootScope, $q, $location, $route, CorkAuthorizationError) {

                    // subscribe to route change errors
                    // * @todo test redirects
                    $rootScope.$on('$routeChangeError', function ($event, current, previous, error) {
                        var redirectPath;
                        if (error instanceof CorkAuthorizationError) {

                            // desination defined in the error
                            if (isString(error.redirectPath)) {
                                redirectPath = error.redirectPath;
                            }
                            // destination defined in the rejected route
                            else {
                                var $$route = current.$$route;
                                var onReject = $$route.corkAuthorization.onReject;
                                // as a string
                                if (isString(onReject)) {
                                    redirectPath = onReject;
                                }
                                // defined as a function, let's invoke it
                                else if (isFunction(onReject)) {
                                    redirectPath = onReject($$route);
                                }
                            }
                            // fallbacks
                            if (!redirectPath) {
                                // to previous route (if it exists)
                                if (previous && previous.$$route) {
                                    redirectPath = interpolate(previous.$$route.originalPath, previous.params);
                                }
                                // or fallback to / @todo configure this
                                else {
                                    redirectPath = '/';
                                }
                            }
                            $location.path(redirectPath);
                        }
                    });

                    var CorkAuthorization = function () {
                        var self = this;

                        /**
                         * @ngdoc function
                         * @name $authorizeRoute
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         *
                         * @returns {Promise} As expected by [$routeProvider](https://docs.angularjs.org/api/ngRoute/provider/$routeProvider).
                         * Promise is resolved or rejected depending on auhotization being granted or denied.
                         */
                        self.$authorizeRoute = function () {
                            var defer = $q.defer();

                            var $$route = $route.current.$$route;
                            var rules;
                            var promises;

                            // only process routes with a `corkAuthorization` property of type object.
                            if (!isObject($$route.corkAuthorization) || !isObject($$route.corkAuthorization.rules)) {
                                defer.resolve();
                            } else {
                                rules = $$route.corkAuthorization.rules;
                                promises = [];

                                if (isFunction(rules)) {
                                    rules = [rules];
                                } else if (!isArray(rules)) {
                                    throw new Error('Invalid corkAuthorization rules in $$route "' + $$route + '".');
                                }
                            }

                            // collect a local deferred per authorization method
                            var ruleDefer;
                            var returnValue;
                            rules.forEach(function (rule, key) {
                                if (!isFunction(rule)) {
                                    throw new Error('Invalid corkAuthorization rule in $$route "' + $$route + '".');
                                }
                                returnValue = rule($route.current);
                                if (isPromise(returnValue)) {
                                    returnValue.then(ruleDefer.resolve, ruleDefer.reject);
                                } else {
                                    ruleDefer = $q.defer();
                                    promises.push(ruleDefer.promise);
                                    if (returnValue) {
                                        ruleDefer.reject(returnValue);
                                    } else {
                                        ruleDefer.resolve();
                                    }
                                }
                                // invoke each method with it's own deferred AND the route for context
                            });

                            // when all the authorization functions resolve/reject
                            $q.all(promises).then(function (resolves) {
                                defer.resolve();
                            }, function (error) {
                                if (!error || isString(error)) {
                                    error = new CorkAuthorizationError(error);
                                } else if (!(error instanceof CorkAuthorizationError)) {
                                    throw new Error('Invalid route rejection error. Must be string with redirectUrl or a CorkAuthorizationError object.');
                                }
                                // make sure error includes the route
                                error.$$route = error.$$route = $$route;
                                // reject and broadcast
                                defer.reject(error);
                                $rootScope.$broadcast('corkAuthorization.rejected', error);
                            });

                            return defer.promise;
                        };

                        /**
                         * @ngdoc function
                         * @name middleware
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         * Registers or retrieves a middleware.
                         *
                         * If only a name is provided it will retrieve the middleware or throw an error
                         * if the middleware is unkonwn. If an implementation is provided it will store it or throw an
                         * error if the middleware is invalid or a middleware with this name was registered before.
                         *
                         * @param {string} name The middleware name.
                         * @param {function|Array} middleware A middleware function or an array defining an injectable function.
                         * @returns {*} The requested middleware function|injectable if called with one argument or the
                         * `corkAuthorization` instance if called with two (for chaining purposes).
                         */
                        self.middleware = function (name, middleware) {
                            var returnValue = (arguments.length > 1) ? provider.middleware(name, middleware) : provider.middleware(name);
                            return returnValue === provider ? self : returnValue;
                        };

                    };

                    return new CorkAuthorization();
                }
            ];

        }

    ]);

})(angular);
