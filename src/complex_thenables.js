"use strict";
module.exports = function( Promise ) {
    var ASSERT = require("./assert.js");
    var async = require( "./async.js" );
    var util = require( "./util.js" );
    var isPrimitive = util.isPrimitive;
    var errorObj = util.errorObj;
    var isObject = util.isObject;
    var tryCatch2 = util.tryCatch2;

    function getThen(obj) {
        try {
            return obj.then;
        }
        catch(e) {
            errorObj.e = e;
            return errorObj;
        }
    }

    function isThenable(obj, ref) {
        if (isPrimitive(obj)) {
            return false;
        }
        var then = getThen(obj);

        if (then === errorObj) {
            ref.ref = errorObj;
            return false;
        }

        if (typeof then === "function") {
            ref.ref = then;
            return true;
        }
        return false;
    }

    var ref = {ref: null};
    function Promise$_Cast( obj, caller ) {
        if( isObject( obj ) ) {
            if( obj instanceof Promise ) {
                return obj;
            }

            if( isThenable( obj, ref ) ) {
                caller = typeof caller === "function" ? caller : Promise$_Cast;
                var then = ref.ref;
                ref.ref = null;
                return doThenable( obj, then, caller );
            }
            else if (ref.ref === errorObj) {
                ref.ref = null;
                return Promise.reject(errorObj.e);
            }
            ref.ref = null;
        }
        return obj;
    }

    Promise._cast = Promise$_Cast;
    Promise._isThenable = isThenable;

    function doThenable( x, then, caller ) {
        ASSERT(typeof then === "function");

        function resolveFromThenable( a ) {
            if( called ) return;
            called = true;

            if (a === x) {
                ASSERT( resolver.promise.isPending() );
                resolver.promise._resolveFulfill( a );
                return;
            }
            var b = Promise$_Cast( a );
            if( b === a ) {
                resolver.resolve( a );
            }
            else {
                b._then(
                    resolver.resolve,
                    resolver.reject,
                    void 0,
                    resolver,
                    void 0,
                    resolveFromThenable
                );
            }

        }

        function rejectFromThenable( a ) {
            if( called ) return;
            called = true;
            resolver.reject( a );
        }


        var resolver = Promise.defer( caller );

        var called = false;
        var ret = tryCatch2(then, x, resolveFromThenable, rejectFromThenable);
        if( ret === errorObj && !called ) {
            resolver.reject( ret.e );
        }
        return resolver.promise;
    }

    Promise.prototype._resolveThenable =
    function Promise$_resolveThenable(x, then) {
        ASSERT(typeof then === "function");
        var localP = this;
        var key = {};
        var called = false;

        function resolveFromThenable( v ) {
            if( called && this !== key ) return;
            called = true;
            var fn = localP._fulfill;
            var b = Promise$_Cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                if( v === x ) {
                    //Thenable used itself as the value
                    async.invoke( fn, localP, v );
                }
                else {
                    b._then( resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                }
                return;
            }


            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                ASSERT( b.isResolved() );
                v = v._resolvedValue;
                b = Promise$_Cast( v );
                ASSERT( b instanceof Promise || b === v );
                if( b !== v ||
                    ( b instanceof Promise && b !== v ) ) {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                    return;
                }
            }
            async.invoke( fn, localP, v );
        }

        function rejectFromThenable( v ) {
            if( called && this !== key ) return;
            var fn = localP._reject;
            called = true;

            var b = Promise$_Cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                if( v === x ) {
                    //Thenable used itself as the reason
                    async.invoke( fn, localP, v );
                }
                else {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                }
                return;
            }


            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                ASSERT( b.isResolved() );
                v = v._resolvedValue;
                b = Promise$_Cast( v );
                if( b !== v ||
                    ( b instanceof Promise && b.isPending() ) ) {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                    return;
                }
            }

            async.invoke( fn, localP, v );
        }
        var threw = tryCatch2( then, x,
                resolveFromThenable, rejectFromThenable);

        //3.3.4 If calling then throws an exception e,
        if( threw === errorObj &&
            !called ) {
            this._attachExtraTrace( threw.e );
            //3.3.4.2 Otherwise, reject promise with e as the reason.
            async.invoke( this._reject, this, threw.e );
        }
    };
};
