describe('ng.cork.authorization', function () {
    'use strict';

    beforeEach(module('ng.cork.authorization'));

    describe('corkAuthorizationProvider', function () {

        var corkAuthorizationProvider;
        beforeEach(module(function (_corkAuthorizationProvider_) {
            corkAuthorizationProvider = _corkAuthorizationProvider_;
        }));

        // kickstart the injector http://stackoverflow.com/questions/15391683/how-can-i-test-a-angularjs-provider
        beforeEach(inject(function (corkAuthorization) {}));

        it('should be an object.', function () {

            expect(typeof corkAuthorizationProvider).toBe('object');
        });

        it('should initialize with known defaults.', inject(function (corkAuthorization) {

            expect(corkAuthorization.defaultRedirectPath).toBe('/');
        }));

        describe('configure()', function () {

            it('should store the provided configuration.', inject(function (corkAuthorization) {

                var defaultRedirectPath = '/foo/bar/baz';

                corkAuthorizationProvider.configure({
                    defaultRedirectPath: defaultRedirectPath,
                });

                expect(corkAuthorization.defaultRedirectPath).toBe(defaultRedirectPath);
            }));
        });

        describe('$authorizeRoute', function () {

            it('should be an injectable.', function () {

                expect(typeof corkAuthorizationProvider.$authorizeRoute).toBe('object');
                expect(corkAuthorizationProvider.$authorizeRoute[0]).toBe('corkAuthorization');
                expect(typeof corkAuthorizationProvider.$authorizeRoute[1]).toBe('function');
            });

            it('should invoke "corkAuthorization.$authorizeRoute()" and return its return value.', function () {

                var corkAuthorizationMock = jasmine.createSpyObj('corkAuthorization', ['$authorizeRoute']);
                var expectedReturnValue = {};
                corkAuthorizationMock.$authorizeRoute.and.returnValue(expectedReturnValue);

                var returnValue = corkAuthorizationProvider.$authorizeRoute[1](corkAuthorizationMock);

                expect(corkAuthorizationMock.$authorizeRoute).toHaveBeenCalled();
                expect(returnValue).toBe(expectedReturnValue);
            });
        });

        describe('middleware()', function () {

            it('should throw an exception if first argument is not a string.', function ()  {

                expect(function () {
                    corkAuthorizationProvider.middleware(false);
                }).toThrow(new Error('Invalid corkAuthorization middleware name.'));
            });

            describe('when two arguments are provided', function () {

                it('should throw an exception if second argument is neither Array or Function.', function ()  {

                    expect(function () {
                        corkAuthorizationProvider.middleware('foo', false);
                    }).toThrow(new Error('Invalid corkAuthorization middleware "foo".'));
                });

                it('should return the api instance.', function ()  {

                    expect(corkAuthorizationProvider.middleware('foo', function () {})).toBe(corkAuthorizationProvider);
                });

                it('should throw an exception if middleware is already registered.', function ()  {

                    corkAuthorizationProvider.middleware('foo', function () {});

                    expect(function () {
                        corkAuthorizationProvider.middleware('foo', function () {});
                    }).toThrow(new Error('corkAuthorization middleware "foo" is already registered.'));
                });

                describe('and second argument is an array', function () {

                    it('should throw an exception if last element of last element of the array is not a function.', function ()  {

                        expect(function () {
                            corkAuthorizationProvider.middleware('foo', ['bar', 'baz']);
                        }).toThrow(new Error('Invalid corkAuthorization middleware "foo".'));
                    });
                });
            });

            describe('when one argument is provided', function () {

                it('should return the api instance.', function ()  {

                    expect(corkAuthorizationProvider.middleware('foo', function () {})).toBe(corkAuthorizationProvider);
                });

                it('should throw an exception if middleware is unknown.', function ()  {

                    expect(function () {
                        corkAuthorizationProvider.middleware('foo');
                    }).toThrow(new Error('Unknown corkAuthorization middleware "foo".'));
                });

                it('should return the middleware.', function ()  {

                    var fn = function () {};

                    corkAuthorizationProvider.middleware('foo', fn);

                    var middleware = corkAuthorizationProvider.middleware('foo');

                    expect(middleware).toBe(fn);
                });
            });
        });

    });

    describe('corkAuthorization', function () {

        var corkAuthorizationProvider;
        beforeEach(module(function (_corkAuthorizationProvider_) {
            corkAuthorizationProvider = _corkAuthorizationProvider_;
        }));

        var $mockRoute = {
            current: {
                $$route: {}
            }
        };
        var $mockLocation;
        beforeEach(module(function ($provide) {
            // mock $route object
            $provide.value('$route', $mockRoute);
            // mock $location service
            $mockLocation = jasmine.createSpyObj('$mockLocation', ['path']);
            $provide.value('$location', $mockLocation);
        }));

        // kickstart the injector http://stackoverflow.com/questions/15391683/how-can-i-test-a-angularjs-provider
        beforeEach(inject(function (corkAuthorization) {}));

        var resolveSpy;
        var rejectSpy;
        var ruleSpy;
        var ruleDefer;
        var rulePromise;
        beforeEach(inject(function ($q) {
            // spies attached to then()
            resolveSpy = jasmine.createSpy('resolveSpy');
            rejectSpy = jasmine.createSpy('rejectSpy');
            // mock rule
            ruleSpy = jasmine.createSpy('ruleSpy');
            ruleDefer = $q.defer();
            rulePromise = ruleDefer.promise;
        }));

        it('should be an object.', inject(function (corkAuthorization) {

            expect(typeof corkAuthorization).toBe('object');
        }));

        describe('$authorizeRoute()', function () {

            it('should return a promise.', inject(function (corkAuthorization) {

                var promise = corkAuthorization.$authorizeRoute();

                expect(typeof promise).toBe('object');
                expect(typeof promise.then).toBe('function');
            }));

            describe('when "$$route.corkAuthorization" is not an object', function () {

                it('should resolve.', inject(function (corkAuthorization, $rootScope) {

                    corkAuthorization.$authorizeRoute().then(resolveSpy);
                    // trigger the promises
                    $rootScope.$apply();

                    expect(resolveSpy).toHaveBeenCalledWith(undefined);
                }));
            });

            describe('when "$$route.corkAuthorization.rules" is not set', function () {

                it('should resolve.', inject(function (corkAuthorization, $rootScope) {

                    $mockRoute.current.$$route.corkAuthorization = {};

                    corkAuthorization.$authorizeRoute().then(resolveSpy);
                    // trigger the promises
                    $rootScope.$apply();

                    expect(resolveSpy).toHaveBeenCalledWith(undefined);
                }));
            });

            describe('when "$$route.corkAuthorization.rules" is not an array', function () {

                it('should resolve.', inject(function (corkAuthorization, $rootScope) {

                    $mockRoute.current.$$route.corkAuthorization = {
                        rules: {}
                    };

                    corkAuthorization.$authorizeRoute().then(resolveSpy);
                    // trigger the promises
                    $rootScope.$apply();

                    expect(resolveSpy).toHaveBeenCalledWith(undefined);
                }));
            });

            describe('when "$$route.corkAuthorization.rules" is an array', function () {

                describe('and one of the rules is not a function', function () {

                    it('should throw an error.', inject(function (corkAuthorization) {

                        $mockRoute.current.$$route.corkAuthorization = {
                            rules: [false]
                        };

                        expect(function () {
                            corkAuthorization.$authorizeRoute();
                        }).toThrow(new Error('Invalid corkAuthorization rule in $$route.'));
                    }));
                });

                describe('and rules contains a function', function () {

                    beforeEach(function () {
                        $mockRoute.current.$$route.corkAuthorization = {
                            rules: [ruleSpy]
                        };
                    });

                    it('should invoke the rule with "$$route".', inject(function (corkAuthorization) {

                        corkAuthorization.$authorizeRoute();

                        expect(ruleSpy).toHaveBeenCalledWith($mockRoute.current.$$route);
                    }));

                    describe('that returns a falsy value', function () {

                        beforeEach(function () {
                            ruleSpy.and.returnValue(false);
                        });

                        it('should resolve.', inject(function (corkAuthorization, $rootScope) {

                            corkAuthorization.$authorizeRoute().then(resolveSpy);
                            // trigger the promises
                            $rootScope.$apply();

                            expect(resolveSpy).toHaveBeenCalledWith(undefined);
                        }));
                    });

                    describe('that returns a string', function () {

                        beforeEach(function () {
                            ruleSpy.and.returnValue('/bar/baz');
                        });

                        it('should reject with an instance of CorkAuthorizationError populated with the "redirectPath" and the rejected "$$route".', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                            corkAuthorization.$authorizeRoute().then(resolveSpy, rejectSpy);
                            // trigger the promises
                            $rootScope.$apply();

                            var expected = new CorkAuthorizationError('/bar/baz', $mockRoute.current.$$route);

                            expect(rejectSpy).toHaveBeenCalledWith(expected);
                        }));
                    });

                    describe('that returns an instance of CorkAuthorizationError', function () {

                        beforeEach(inject(function (CorkAuthorizationError) {
                            ruleSpy.and.returnValue(new CorkAuthorizationError('/bar/baz'));
                        }));

                        it('should reject with an instance of CorkAuthorizationError populated with the "redirectPath" and the rejected "$$route".', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                            corkAuthorization.$authorizeRoute().then(resolveSpy, rejectSpy);
                            // trigger the promises
                            $rootScope.$apply();

                            var expected = new CorkAuthorizationError('/bar/baz', $mockRoute.current.$$route);

                            expect(rejectSpy).toHaveBeenCalledWith(expected);
                        }));
                    });

                    describe('that returns anything else', function () {

                        beforeEach(function () {
                            ruleSpy.and.returnValue({});
                        });

                        it('should throw an error.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                            corkAuthorization.$authorizeRoute();

                            expect(function () {
                                $rootScope.$apply();
                            }).toThrow(new Error('Invalid route rejection error. Must be string with redirectUrl or a CorkAuthorizationError object.'));
                        }));
                    });

                    describe('that returns a promise', function () {

                        beforeEach(function () {
                            ruleSpy.and.returnValue(rulePromise);
                        });

                        describe('and the promise is resolved', function () {

                            beforeEach(function () {
                                ruleDefer.resolve();
                            });

                            it('should resolve.', inject(function (corkAuthorization, $rootScope) {

                                corkAuthorization.$authorizeRoute().then(resolveSpy);
                                // trigger the promises
                                $rootScope.$apply();

                                expect(resolveSpy).toHaveBeenCalledWith(undefined);
                            }));
                        });

                        describe('and the promise is rejected', function () {

                            describe('with a string', function () {

                                beforeEach(function () {
                                    ruleDefer.reject('/bar/baz');
                                });

                                it('should reject with an instance of CorkAuthorizationError populated with the "redirectPath" and the rejected "$$route".', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                    corkAuthorization.$authorizeRoute().then(resolveSpy, rejectSpy);
                                    // trigger the promises
                                    $rootScope.$apply();

                                    var expected = new CorkAuthorizationError('/bar/baz', $mockRoute.current.$$route);

                                    expect(rejectSpy).toHaveBeenCalledWith(expected);
                                }));
                            });

                            describe('with an instance of CorkAuthorizationError', function () {

                                var error;
                                beforeEach(inject(function (CorkAuthorizationError) {
                                    error = new CorkAuthorizationError('/qux/quux');
                                    ruleDefer.reject(error);
                                }));

                                it('should reject with an instance of CorkAuthorizationError populated with the "redirectPath" and the rejected "$$route".', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                    corkAuthorization.$authorizeRoute().then(resolveSpy, rejectSpy);
                                    // trigger the promises
                                    $rootScope.$apply();

                                    var expected = new CorkAuthorizationError('/qux/quux', $mockRoute.current.$$route);

                                    expect(rejectSpy).toHaveBeenCalledWith(expected);
                                }));
                            });

                            describe('with any other type of object', function () {

                                beforeEach(function () {
                                    ruleDefer.reject({});
                                });

                                it('should throw an error.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                    corkAuthorization.$authorizeRoute();

                                    expect(function () {
                                        $rootScope.$apply();
                                    }).toThrow(new Error('Invalid route rejection error. Must be string with redirectUrl or a CorkAuthorizationError object.'));
                                }));
                            });
                        });
                    });
                });
            });
        });

        describe('middleware()', function () {

            it('should invoke corkAuthorizationProvider.middleware() with the provider params.', inject(function (corkAuthorization) {

                spyOn(corkAuthorizationProvider, 'middleware');

                var name = 'foo';
                var fn = function () {};

                corkAuthorization.middleware(name, fn);

                expect(corkAuthorizationProvider.middleware).toHaveBeenCalledWith(name, fn);
            }));

            it('should replace the return value with self when invoked with two params.', inject(function (corkAuthorization) {

                var name = 'foo';
                var fn = function () {};

                var result = corkAuthorization.middleware(name, fn);

                expect(result).toBe(corkAuthorization);
            }));

            it('should NOT replace the return value when invoked with one param.', inject(function (corkAuthorization) {

                var name = 'foo';
                var fn = function () {};
                corkAuthorization.middleware(name, fn);

                var result = corkAuthorization.middleware(name);

                expect(result).toBe(fn);
            }));

        });

        describe('$routeChangeError', function () {

            it('should bind "$routeChangeError".', inject(function (corkAuthorization) {

                // untestable $rootScope.$on is not a function we can spyOn
            }));

            describe('when "error" is NOT an instanceof CorkAuthorizationError', function () {

                it('should NOT invoke "$location.path()"', inject(function (corkAuthorization, $rootScope) {

                    var current;
                    var previous;
                    var error;
                    $rootScope.$broadcast('$routeChangeError', current, previous, error);

                    expect($mockLocation.path).not.toHaveBeenCalled();
                }));

            });

            describe('when "error" is an instanceof CorkAuthorizationError', function () {

                describe('and the error`s "redirectPath" is a string', function () {

                    var current = {
                        $$route: {}
                    };
                    var previous;
                    var error;
                    beforeEach(inject(function (CorkAuthorizationError) {
                        error = new CorkAuthorizationError('/foo/bar');
                    }));

                    it('should invoke "$location.path()" with the error`s "redirectPath".', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                        $rootScope.$broadcast('$routeChangeError', current, previous, error);

                        expect($mockLocation.path).toHaveBeenCalledWith('/foo/bar');
                    }));

                });

                describe('and the error`s "redirectPath" is undefined', function () {

                    var current;
                    var previous;
                    var error;
                    beforeEach(inject(function (CorkAuthorizationError) {
                        error = new CorkAuthorizationError();
                    }));

                    describe('there is no "onReject" on the $$route.corkAuthorization', function () {

                        beforeEach(function () {
                            current = {
                                $$route: {
                                    corkAuthorization: {}
                                }
                            };
                        });

                        describe('and there is no "previous".', function () {

                            beforeEach(function () {
                                previous = null;
                            });

                            it('should invoke "$location.path()" with the default redirect path.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                $rootScope.$broadcast('$routeChangeError', current, previous, error);

                                expect($mockLocation.path).toHaveBeenCalledWith('/');
                            }));

                        });

                        describe('and there is no "previous.$$route".', function () {

                            beforeEach(function () {
                                previous = {};
                            });

                            it('should invoke "$location.path()" with the default redirect path.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                $rootScope.$broadcast('$routeChangeError', current, previous, error);

                                expect($mockLocation.path).toHaveBeenCalledWith('/');
                            }));

                        });

                        describe('and there is a "previous.$$route".', function () {

                            beforeEach(function () {
                                previous = {
                                    $$route: {
                                        originalPath: '/foo/:id',
                                    },
                                    params: {
                                        id: 'bar'
                                    }
                                };
                            });

                            it('should invoke "$location.path()" with the interpolated path of the previous route.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                $rootScope.$broadcast('$routeChangeError', current, previous, error);

                                expect($mockLocation.path).toHaveBeenCalledWith('/foo/bar');
                            }));

                        });
                    });

                    describe('there is a "onReject" property on the $$route.corkAuthorization', function () {

                        describe('but it is invalid.', function () {

                            beforeEach(function () {
                                current = {
                                    $$route: {
                                        corkAuthorization: {
                                            onReject: false
                                        }
                                    }
                                };
                            });

                            it('should throw an error.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                expect(function () {
                                    $rootScope.$broadcast('$routeChangeError', current, previous, error);
                                }).toThrow(new Error('Invald onReject handler. Must be an array or function.'));
                            }));
                        });

                        describe('and it is a string.', function () {

                            beforeEach(function () {
                                current = {
                                    $$route: {
                                        corkAuthorization: {
                                            onReject: '/quux/quuux'
                                        }
                                    }
                                };
                            });

                            it('should invoke "$location.path()" with the "onReject" string.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                $rootScope.$broadcast('$routeChangeError', current, previous, error);

                                expect($mockLocation.path).toHaveBeenCalledWith('/quux/quuux');
                            }));
                        });

                        describe('and it is a function.', function () {

                            var onRejectSpy;
                            beforeEach(function () {
                                onRejectSpy = jasmine.createSpy('onRejectSpy');
                                current = {
                                    $$route: {
                                        corkAuthorization: {
                                            onReject: onRejectSpy
                                        }
                                    }
                                };
                            });

                            it('should invoke "$location.path()" with the "onReject" string.', inject(function (corkAuthorization, CorkAuthorizationError, $rootScope) {

                                onRejectSpy.and.returnValue('/corge');

                                $rootScope.$broadcast('$routeChangeError', current, previous, error);

                                expect($mockLocation.path).toHaveBeenCalledWith('/corge');
                            }));
                        });
                    });
                });
            });
        });
    });
});
