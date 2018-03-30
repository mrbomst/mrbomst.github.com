/*!
 * ds - ds For Mobile
 * author: _米
 * create: 2012.06.29
 * update: 2013.10.18
 * Email: laoshu133@vip.qq.com
*/
;(function(global, document, undefined){
	'use strict';
	var 
	//Base
	rword = /([^,| ])+/g,
	rtrim = /^\s*|\s*$/g,
	//rblock = /\{([^\}]*)\}/ig,
	returnTrue = function(){ return true;},
	returnFalse = function(){ return false;},
	ds = global.ds = {
		noop: function(){},
		//Object
		mix: function(target, source, cover){
			if(typeof source !== 'object'){
				cover = source;
				source = target;
				target = this;
			}
			for(var k in source){
				if(cover || target[k] === undefined){
					target[k] = source[k];
				}
			}
			return target;
		},
		each: function(target, callback){
			var i = 0, l = target.length;
			if(typeof l === 'number' && target.hasOwnProperty('length')){
				for(; i<l; i++){
					if(callback.call(target[i], i, target[i]) === false){
						return this;
					}
				}
			}
			else{
				for(i in target){
					if(callback.call(target[i], i, target[i]) === false){
						return this;
					}
				}
			}
			return this;
		},
		class2type: {
			'[object HTMLDocument]' : 'document',
			'[object HTMLCollection]' : 'nodelist',
			'[object StaticNodeList]' : 'nodelist',
			'[object DOMWindow]' : 'window'
		},
		type: function(obj, type){
			var 
			class2type = this.class2type,
			toString = class2type.toString,
			_type = obj == null ? String(obj) : class2type[toString.call(obj)] || obj.nodeName || toString.call(obj).slice(8, -1);
			return type ? _type.toLowerCase() === type.toLowerCase() : _type.toLowerCase();
		},
		//String
		trim: function(str){
			return str.replace(rtrim, '');
		},
		//Events
		on: function(elem, type, handler){
			if(typeof elem === 'string'){
				elem = ds.$(elem);
			}
			if(elem && 'addEventListener' in elem){
				handler['_evt_' + type + '_handler'] = function(e){
					if(!e.isPropagationStopped){
						var stopPropagation = e.stopPropagation;
						e.isPropagationStopped = returnFalse;
						e.stopPropagation = function(){
							stopPropagation.call(e);
							e.isPropagationStopped = returnTrue;
						};
					}
					if(!e.isDefaultPrevented){
						var preventDefault = e.preventDefault;
						e.isDefaultPrevented = returnFalse;
						e.preventDefault = function(){
							preventDefault.call(e);
							e.isDefaultPrevented = returnTrue;
						};
					}
					handler.call(this, e);
				};
				elem.addEventListener(type, handler['_evt_' + type + '_handler'], false);
			}
			else if(elem && elem.length > 0){
				this.each(elem, function(){
					ds.on(this, type, handler);
				});
			}
			//initTapEvent
			if(type === 'tap'){
				this.initTapEvent();
			}
			return this;
		},
		un: function(elem, type, handler){
			if(typeof elem === 'string'){
				elem = ds.$(elem);
			}
			if(elem && 'removeEventListener' in elem){
				elem.removeEventListener(type, handler['_evt_' + type + '_handler'] || handler, false);
			}
			else if(elem.length > 0 && elem[0]){
				this.each(elem, function(){
					ds.un(this, type, handler);
				});
			}
			return this;
		},
		trigger: function(elem, type){
			var evt;
			if(elem && elem.dispatchEvent){
				evt = document.createEvent('Event');
				evt.initEvent(type, true, true);
				elem.dispatchEvent(evt);
			}
			return this;
		},
		delegate: function(elem, targetSelector, type, handler){
			ds.on(elem, type, function(e){
				if(!e.isPropagationStopped || !e.isPropagationStopped()){
					var target = e.target, elems = ds.$(targetSelector, this);
					ds.each(elems, function(){
						if(this === target || ds.contains(this, target)){
							(handler || ds.noop).call(this, e);
							return false;
						}
					});
				}
			});
			return this;
		},
		one: function(elem, type, handler){
			var _handler = function(e){
				ds.un(this, type, _handler);
				return handler.call(this, e);
			};
			return this.on(elem, type, _handler);
		},
		//https://github.com/kozmoz/fastclick/blob/master/scripts/fastclick.js
		initTapEvent: function(){
			if(this.tapInited || ('ontap' in document)){ return; }
			this.tapInited = true;

			var 
			ontap = false, 
			fire = function(e){
				var evt = document.createEvent('CustomEvent');
				evt.initCustomEvent('tap', true, true, e.target);

				e.target.dispatchEvent(evt);
			};

			if('ontouchstart' in document){
				document.addEventListener('touchstart', function(){
					ontap = true;
				}, false);
				document.addEventListener('touchmove', function(){
					ontap = false;
				}, false);
				document.addEventListener('touchend', function(e){
					if(ontap){
						ontap = false;
						fire(e);
					}
				}, false);
			}
			else{
				document.addEventListener('click', function(e){
					fire(e);
				});
			}
		},
		ready: function(handler){
			if(document.readyState === 'complete' || document.readyState === 'loaded'){
				handler.call(document);
			}
			else{
				ds.on(document, 'DOMContentLoaded', handler, false);
			}
			return this;
		},
		//DOM
		$: function(selector, context){
			var type = typeof selector;
			if(selector && type === 'object' || type === 'function'){ return 'length' in selector ? selector : [selector];}
			return (context || document).querySelectorAll(selector);
		},
		$d: function(id){ return document.getElementById(id);},
		contains: document.documentElement.contains ? function(elA, elB){
			return (elA !== elB && elA.contains && elA.contains(elB));
		}: function(elA, elB){
			return !!(elA && elB && elA.compareDocumentPosition(elB) & 16);
		},
		hasClass: function(elem, className){
			return (' ' + this.$(elem)[0].className + ' ').indexOf(' ' + className + ' ') > -1;
		},
		addClass: function(elem, classNames){
			if(!!classNames){
				ds.each(ds.$(elem), function(){
					var cNames = [], cName = ds.trim(this.className);
					classNames.replace(rword, function(name){ cNames[cNames.length] = name; });
					if(!!cName){
						cNames.unshift(cName);
					}
					this.className = ds.trim(cNames.join(' '));
				});
			}
			return this;
		},
		removeClass: function(elem, classNames){
			if(!!classNames){
				classNames = classNames.split(/\s+/g);
				var cName, len = classNames.length;
				ds.each(ds.$(elem), function(){
					var _cName = ' ' + this.className;
					this.className = ds.trim(_cName.replace(new RegExp('\\s*(?:' + classNames.join('|') + ')\\s*', 'g'), ' '));
				});
			}
			return this;
		},
		parseNode: function(html, baseNode){
			baseNode = baseNode || document;
			if(typeof html === 'string' && 'nodeType' in baseNode){
				var range = (baseNode.ownerDocument || baseNode).createRange();
				range.setStartBefore(baseNode.body || baseNode);
				return range.createContextualFragment(html);
			}
			return html;
		},
		before: function(baseNode, node){
			baseNode.parentNode.insertBefore(this.parseNode(node, baseNode), baseNode);
			return this;
		},
		after: function(baseNode, node){
			if(baseNode.nextSibling){
				baseNode.parentNode.insertBefore(this.parseNode(node, baseNode), baseNode.nextSibling);
			}
			else{
				baseNode.parentNode.appendChild(this.parseNode(node, baseNode));
			}
			return this;
		},
		prepend: function(baseNode, node){
			baseNode.insertBefore(this.parseNode(node, baseNode), baseNode.firstChild);
			return this;
		},
		append: function(baseNode, node){
			baseNode.appendChild(this.parseNode(node, baseNode));
			return this;
		},
		//BOM
		scrollTop: function(){
			global.scrollTo(0, 0);
			return this;
		},
		scrollTo : function(posY) {
			global.scrollTo(0, posY);
			return this;
		},
		//Debug
		debug: !!global.debug,
		log: function(){
			if(!this.debug) return;
			if(global.console && navigator.userAgent.indexOf('Mobile') < 0){
				return console.log.apply(console, arguments);
			}
			alert([].join.call(arguments, ', '));
		}
	};
	//Extend DOM
	ds.mix((function(){
		function currCss(elem, name){
			return global.getComputedStyle(elem, null)[name];
		}
		return {
			hide: function(elems){
				if(typeof elems === 'string'){
					elems = ds.$(elems);
				}
				if(typeof elems.length !== 'number'){
					elems = [elems];
				}
				this.each(elems, function(i, elem){
					if(elem && elem.style){
						elem.style.display = 'none';
					}
				});
				return this;
			},
			show: function(elems, display){
				if(typeof elems === 'string'){
					elems = ds.$(elems);
				}
				if(typeof elems.length !== 'number'){
					elems = [elems];
				}
				var style, tmpElem, tmpDisplay, body = document.body;
				this.each(elems, function(i, elem){
					if(elem && (style = elem.style)){
						style.display = display || '';
						if(currCss(elem, 'display') === 'none'){
							tmpElem = document.createElement(elem.nodeName.toLowerCase());
							body.appendChild(tmpElem);
							tmpDisplay = currCss(tmpElem, 'display');
							elem.style.display = tmpDisplay;
							body.removeChild(tmpElem);
							tmpElem = null;
						}
					}
				});
				return this;
			}
		};
	})());
	//AJAX
	ds.mix((function(){
		var _ops = {
			url: '/',
			type: 'get',
			async: true,
			cache: true,
			timeout: 30,
			data: null,
			dataType: 'string',
			complete: ds.noop,
			success: ds.noop,
			error: ds.noop
		};
		function serialize(data, url, noCache){
			var ret = [], isGet = typeof url === 'string', searchInx = (url || '').indexOf('?');
			for(var k in (data = data || {})){
				ret.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k]));
			}
			!!noCache && ret.push('_ds_=' + new Date().getTime());
			if(typeof url !== 'string' || searchInx === url.length - 1) return ret.join('&');
			return (searchInx < 0 ? '?': '&') + ret.join('&');
		}
		function AJAX(ops){
			this.init(ops);
		}
		AJAX.prototype = {
			constructor: AJAX,
			init: function(ops){
				ops = this.ops = ds.mix(ops || {}, _ops);
				var 
				self = this,
				xhr = this.xhr = new XMLHttpRequest(),
				_timer = setTimeout(function(){
					xhr.onreadystatechange = null;
					self.statusText = 'timeout';
					self.fail();
				}, ops.timeout * 1000);
				xhr.onreadystatechange = function(){
					if((self.readyState = xhr.readyState) === 4){
						var isSuccess = true;
						self.statusText = xhr.statusText.toLowerCase();
						var data = null, status = self.status = xhr.status;
						if(status >= 200 && status < 300 || status === 304){
							status === 304 && (self.statusText = 'notmodified');
							data = ops.dataType === 'xml' ? xhr.responseXML: xhr.responseText;
							if(ops.dataType === 'json'){
								try{ data = JSON.parse(data);}
								catch(e){
									isSuccess = false;
									self.statusText = 'parsererror';
								}
							}
						}
						else{
							isSuccess = false;
							self.statusText = self.statusText || 'error';
						}
						self.data = data;
						global.clearTimeout(_timer);
						xhr.onreadystatechange = null;
						self[isSuccess ? 'success': 'fail']().complete();
					}
				};
				var 
				isPost = ops.type.toUpperCase() === 'POST',
				data = serialize(ops.data, ops.url, (!isPost && !ops.cache));
				this.url = ops.url + (isPost || data.length <= 1 ? '': data);
				xhr.open(ops.type.toUpperCase(), this.url, ops.async, ops.username, ops.password);
				!ops.cache && xhr.setRequestHeader('Cache-Control', 'no-store, no-cache');
				isPost && xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				//isPost && xhr.setRequestHeader('Content-Length', this.serialize(ops.data).length);
				xhr.send(isPost ? data: null);
			},
			status: 0,
			readyState: 0,
			statusText: 'init',
			abort: function(){
				this.xhr.abort();
				return this;
			},
			fail: function(){
				this.abort();
				this.ops.error.call(this, this, this.statusText);
				return this;
			},
			success: function(){
				this.ops.success.call(this, this.data, this.statusText);
				return this;
			},
			complete: function(){
				this.ops.complete.call(this, this, this.statusText, this.data);
				return this;
			}
		};
		return {
			ajax: function(ops){
				return new AJAX(ops);
			},
			get: function(url, data, success, dataType){
				if(typeof data === 'function'){
					dataType = success;
					success = data;
					data = null;
				}
				return new AJAX({url: url, type: 'get', data: data, dataType: dataType, success: success});
			},
			post: function(url, data, success, dataType){
				if(typeof data === 'function'){
					dataType = success;
					success = data;
					data = null;
				}
				return new AJAX({url: url, type: 'post', data: data, dataType: dataType, success: success});
			}
		};
	})());
	//Viewport
	ds.mix((function(){
		var 
		userAgent = navigator.userAgent,
		standalone = navigator.standalone;
		return {
			device: function(dev){
				return userAgent.indexOf(dev) > -1;
			},
			isLandscape: function(){
				return ('' + global.orientation).indexOf('90') > -1;
			},
			getUseableHeight: function(){
				var innerHeight = global.innerHeight, isLanscape = this.isLandscape();
				if(standalone){
					return screen[isLanscape ? 'width': 'height'] - 20;
				}
				else if(global.parent !== global){
					return innerHeight || 800;
				}
				var height = 0;
				if(ds.isIPad || global.pageYOffset > 0){
					height = innerHeight;
				}
				else if(ds.isIPhone){
					height = (isLanscape ? screen.width - 32: screen.height - 44) - 20;
				}
				else if(ds.isAndroid || ds.isChrome && userAgent.indexOf('Mobile') < 0){
					height = innerHeight + 56;
				}
				else{
					height = (isLanscape ? Math.min: Math.max)(screen.width, screen.height);
				}
				return height;
			},
			updateView: function(){
				var isLandscape = this.isLandscape(), body = document.body;
				if(body && body.classList){
					body.classList.remove('portrait');
					body.classList.remove('landscape');
					body.classList.add(isLandscape ? 'landscape': 'portrait');

					// var minHeight = this.getUseableHeight() + 'px';
					// this.$d('container') && (this.$d('container').style.minHeight = minHeight);
				}
				global.pageYOffset !== 0 && ds.scrollTop();
				return this;
			}
		};
	})());
	//Devices
	('iPhone,iPad,iPod,Chrome,Android').replace(rword, function(a){ ds['is' + a.charAt(0).toUpperCase() + a.slice(1)] = ds.device(a);});
})(this, document);