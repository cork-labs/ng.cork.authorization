/**
 * ng.cork.authorization - v0.0.3 - 2015-04-29
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
     *
     * @todo poor implementation, does not account for optional or greedy params and should be tested against these cases with the real $route service
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

            /**
             * @ngdoc method
             * @name CorkAuthorizationError
             * @methodOf ng.cork.authorization.CorkAuthorizationError
             *
             * @description
             * Constructor.
             *
             * @param {string=} redirectPath Optionally set the desired redirect path.
             *
             * @property {object} $$route The `$$route` being rejected. A reference to
             * [$route.current.$$route](https://docs.angularjs.org/api/ngRoute/service/$route), automatically populated
             * by {@link ng.cork.authorize.corkAuthorization.$authorizeRoute corkAuthorization.$authorizeRoute} when
             * a route is rejected.
             */
            var CorkAuthorizationError = function (redirectPath) {
                this.redirectPath = redirectPath;
            };

            return CorkAuthorizationError;
        }

    ]);

    /**
     * @ngdoc service
     * @name ng.cork.authorization.corkAuthorizationProvider
     *
     * @description
     * Provides a way to configure the {@link ng.cork.authorization.corkAuthorization corkAuthorization} service and
     * a way to reference this service when defining routes at config time.
     *
     * @property {function} $authorizeRoute When defining routes in the `config` phase via
     * [$routeProvider.when](https://docs.angularjs.org/api/ngRoute/provider/$routeProvider#when) you
     * can add this function in the `resolve` param to trigger authorization of the route.
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
             * @type {Object} service configuration.
             */
            var serviceConfig = {
                defaultRedirectPath: '/'
            };

            /**
             * @ngdoc function
             * @name configure
             * @methodOf ng.cork.authorization.corkAuthorizationProvider
             *
             * @description
             * Configures the {@link ng.cork.authorization.corkAuthorization corkAuthorization} service.
             *
             * @param {Object} config Object with configuration options, extends base configuration. Ex:
             * ```
             * {
             *     defaultRedirectPath: '/auth/sign-in'
             * }
             * ```
             */
            provider.configure = function (config) {
                angular.extend(serviceConfig, config);
            };

            /**
             * injectable shotcut to {@link ng.cork.authorize.corkAuthorization.$authorizeRoute corkAuthorization.$authorizeRoute}, documented above as property of the provider
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
             * Authorizes or rejects route changes based on middlewares and optionally redirects.
             *
             * Add middlewares to easily express route rules.
             *
             * <pre>
             * corkAuthorization.middleware('isAdmin', function ($$route) {
             *     // is the current user allowed to access the $$route?
             * });
             * </pre>
             *
             * ## Middlewares
             *
             * Middlewares can be synchronous or asynchronous.
             *
             * ### Synchronous middlewares:
             *
             * To accept/reject the route change the middleware can simply return a truthy/falsy value.
             *
             * <pre>
             * corkAuthorization.middleware('isAdmin', function ($$route) {
             *     return user && user.isAdmin;
             * });
             * </pre>
             *
             * To reject and force the redirect path, the middleware should return a rejected promise, populated with
             * the redirectPath or an instance of {@link ng.cork.authorization.CorkAuthorizationError}.
             *
             * <pre>
             * corkAuthorization.middleware('isAdmin', function ($$route) {
             *     return (user && user.isAdmin) ? true : $q.reject('/redirect/here');
             *     // ... OR ...
             *     return (user && user.isAdmin) ? true : $q.reject(new CorkAuthorizationError('/redirect/here'));
             * });
             * </pre>
             *
             * ### Asynchronous middlewares:
             *
             * To accept/reject the route change the middleware can simply resolve/reject its promise.
             *
             * <pre>
             * corkAuthorization.middleware('isAdmin', function ($$route) {
             *     var defer = $q.defer();
             *     doAsyncStuff().then(function (data) {
             *         if (data.something) {
             *             defer.resolve();
             *         } else {
             *             defer.reject();
             *         }
             *     });
             *     return defer.promise();
             * });
             * </pre>
             *
             * To reject and force the redirect path, the middleware should reject its promise with
             * the desired redirectPath or an instance of {@link ng.cork.authorization.CorkAuthorizationError}.
             *
             * <pre>
             * corkAuthorization.middleware('isAdmin', function () {
             *     var defer = $q.defer();
             *     doAsyncStuff().then(function (data) {
             *         if (data.something) {
             *             defer.resolve();
             *         } else {
             *             defer.reject('/redirect/here');
             *             // ... OR ...
             *             defer.reject(new CorkAuthorizationError('/redirect/here'));
             *         }
             *     });
             *     return defer.promise();
             * });
             * </pre>
             */
            provider.$get = [
                '$rootScope',
                '$q',
                '$location',
                '$route',
                'CorkAuthorizationError',
                function corkAuthorizationFactory($rootScope, $q, $location, $route, CorkAuthorizationError) {

                    /**
                     * @param {Array} rules. Array of functions
                     * @param {object} context As in "$$route" or params.
                     * @returns {Promise} Resolved when all rules resolve/reject
                     */
                    function execRules(rules, context) {
                        var promises = [];
                        var ruleReturnValue;
                        var ruleDefer;
                        // collect a local deferred per authorization method
                        rules.forEach(function (rule, key) {
                            if (!isFunction(rule)) {
                                // @todo: a nice way to identify the $$route
                                throw new Error('Invalid corkAuthorization rule in $$route.');
                            }
                            ruleReturnValue = rule(context);
                            if (isPromise(ruleReturnValue)) {
                                promises.push(ruleReturnValue);
                            } else {
                                ruleDefer = $q.defer();
                                promises.push(ruleDefer.promise);
                                if (ruleReturnValue) {
                                    ruleDefer.resolve();
                                } else {
                                    ruleDefer.reject();
                                }
                            }
                            // invoke each method with it's own deferred AND the route for context
                        });
                        return $q.all(promises);
                    }

                    // subscribe to route change errors
                    // * @todo test redirects
                    $rootScope.$on('$routeChangeError', function ($event, current, previous, error) {
                        var redirectPath;
                        if (error instanceof CorkAuthorizationError) {

                            var $$route = current.$$route;
                            var corkAuthorization = $$route.corkAuthorization;
                            var onReject = corkAuthorization && corkAuthorization.onReject;

                            // desination defined in the error
                            if (isString(error.redirectPath)) {
                                redirectPath = error.redirectPath;
                            }
                            // destination defined in the rejected route
                            else if (corkAuthorization.hasOwnProperty('onReject')) {
                                // as a string
                                if (isString(onReject)) {
                                    redirectPath = onReject;
                                }
                                // defined as a function, let's invoke it
                                else if (isFunction(onReject)) {
                                    redirectPath = onReject($$route);
                                }
                                // invalid
                                else {
                                    throw new Error('Invald onReject handler. Must be an array or function.');
                                }
                            }
                            // fallbacks
                            if (!redirectPath) {
                                // to previous route (if it exists)
                                if (previous && previous.$$route) {
                                    redirectPath = interpolate(previous.$$route.originalPath, previous.params);
                                }
                                // or fallback to default redirect path
                                // @todo configure this via the provider
                                else {
                                    redirectPath = '/';
                                }
                            }
                            $location.path(redirectPath);
                        }
                    });

                    var CorkAuthorization = function () {
                        var self = this;

                        var actions = {};

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
                         * @param {function|Array} middleware The middleware function.
                         * @returns {*} The requested middleware function if called with one argument or the
                         * `corkAuthorization` instance if called with two (for chaining purposes).
                         */
                        self.middleware = function (name, middleware) {
                            var returnValue = (arguments.length > 1) ? provider.middleware(name, middleware) : provider.middleware(name);
                            return returnValue === provider ? self : returnValue;
                        };

                        /**
                         * @ngdoc function
                         * @name $authorizeRoute
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         * When defining routes in the `run` phase via a routeProvider wrapper such as [corkRouter](http://cork-labs.org/projects/ng.cork.router)
                         * you can add this function in the `resolve` param to trigger authorization of the route.
                         *
                         * <pre>
                         * corkRouter.addRoute('foo.edit', {
                         *     pattern: '/foo/:id/edit',
                         *     controller: ...
                         *     resolve: { authorize: corkAuthorization.$authorizeRoute },
                         *     corkAuthorization: {
                         *         rules: [corkAuthorization.middleware('isAuthenticated')],
                         *         redirectPath: '/auth/login'
                         *     }
                         * });
                         * </pre>
                         *
                         * @returns {Promise} As expected by [$routeProvider](https://docs.angularjs.org/api/ngRoute/provider/$routeProvider).
                         * Promise is resolved or rejected depending on auhotization being granted or denied.
                         */
                        self.$authorizeRoute = function () {
                            var defer = $q.defer();

                            var current = $route.current;
                            var $$route = current.$$route;
                            var corkAuthorization = $$route.corkAuthorization;
                            var rules;

                            // only process routes with a `corkAuthorization` property of type object.
                            // @note: early return
                            if (!isObject(corkAuthorization) || !isArray(corkAuthorization.rules)) {
                                defer.resolve();
                                return defer.promise;
                            }

                            // when all the authorization functions resolve/reject
                            execRules($$route.corkAuthorization.rules, $$route).then(function (resolves) {
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
                         * @name addAction
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         * Registers an action with authorization rules.
                         *
                         * <pre>
                         * corkRouter.addAction('foo.edit', [
                         *     corkAuthorization.middleware('isAuthenticated'),
                         *     function () { return true; }
                         * ]);
                         * </pre>
                         *
                         * @param {string} action The action to to register.
                         * @param {array} rules The rules for this action.
                         */
                        self.addAction = function (action, rules) {
                            actions[action] = rules || [];
                        };

                        /**
                         * @ngdoc function
                         * @name authorizeAction
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         * Checks if the action is currently authorized.
                         *
                         * <pre>
                         * corkRouter.authorizeAction('foo.edit').then(
                         *     function () { 
                         *         // was authorized
                         *     }, function () { 
                         *         // was NOT authorized
                         *     }
                         * );
                         * </pre>
                         *
                         * @param {string} action The action to approve.
                         * @returns {Promise} Resolved when all authorization rules resolve, rejected as soon as one of them is rejected.
                         */
                        self.authorizeAction = function (action) {
                            if (!actions[action]) {
                                throw new Error('Unknown action "' + action + '".');
                            }

                            // when all the authorization functions resolve/reject
                            return execRules(actions[action]);
                        };

                        /**
                         * @ngdoc function
                         * @name allowedActions
                         * @methodOf ng.cork.authorization.corkAuthorization
                         *
                         * @description
                         * Returns an object where the keys are the action names and the value is a boolean indicating if the action has been authorized.
                         *
                         * <pre>
                         * $scope.allowedActions = corkRouter.allowedActions(['foo.edit', 'foo.create']);
                         * </pre>
                         *
                         * If an action is authorized the corresponding key will be truthy, else, it will not exist.
                         * <pre>
                         * <div ng-if="allowedActions['foo.edit']"> ... </div>
                         * </pre>
                         *
                         * You can force the rules for each action to be processed again by invoking `$refresh()`.
                         * <pre>
                         * allowedActions.$refresh();
                         * </pre>
                         *
                         * **Note:** authorization is always asynchronous, therefore you can't check the value of the rules 
                         *
                         * @todo: the returned object should have a `$then()` function, bound to a promise always resolved when all actions are resolved/rejected. 
                         * @todo: calling `$refresh()` must cancel any rules currently being processed to avoid race conditions. It should also replace the promise bound to `$then()`. See how `ng.cork.identity` implements this.
                         *
                         * @param {string} action The action to query.
                         * @returns {Object} A map of actions with a `$refresh()` function attached.
                         */
                        self.allowedActions = function (actions) {
                            var allowedActions = {};
                            var $refresh = function () {
                                actions.forEach(function (action) {
                                    self.authorizeAction(action).then(function () {
                                        allowedActions[action] = true;
                                    }, function () {
                                        delete allowedActions[action];
                                    });
                                });
                            };
                            allowedActions.$refresh = $refresh;
                            $refresh();
                            return allowedActions;
                        };
                    };

                    Object.defineProperty(CorkAuthorization.prototype, 'defaultRedirectPath', {
                        get: function () {
                            return serviceConfig.defaultRedirectPath;
                        }
                    });

                    return new CorkAuthorization();
                }
            ];

        }

    ]);

})(angular);
