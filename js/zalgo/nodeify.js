/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var util = require( "./util.js" );
    var async = require( "./async.js" );
    var ASSERT = require( "./assert.js" );
    var tryCatch2 = util.tryCatch2;
    var tryCatch1 = util.tryCatch1;
    var errorObj = util.errorObj;

    function thrower( r ) {
        throw r;
    }

    function Promise$_successAdapter( val, receiver ) {
        var nodeback = this;
        var ret = tryCatch2( nodeback, receiver, null, val );
        if( ret === errorObj ) {
            async.invokeLater( thrower, void 0, ret.e );
        }
    }
    function Promise$_errorAdapter( reason, receiver ) {
        var nodeback = this;
        var ret = tryCatch1( nodeback, receiver, reason );
        if( ret === errorObj ) {
            async.invokeLater( thrower, void 0, ret.e );
        }
    }

    Promise.prototype.nodeify = function Promise$nodeify( nodeback ) {
        if( typeof nodeback == "function" ) {
            this._then(
                Promise$_successAdapter,
                Promise$_errorAdapter,
                void 0,
                nodeback,
                this._isBound() ? this._boundTo : null,
                this.nodeify
            );
        }
        return this;
    };
};
