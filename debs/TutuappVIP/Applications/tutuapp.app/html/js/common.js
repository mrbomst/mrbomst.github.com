/**
 * ds.net
**/
;(function(ds){
	var 
	_form,
	_uuid = 0,
	getForm = function(){
		if(!_form){
			var shell = document.createElement('div');
			shell.style.cssText = 'display:none';
			shell.innerHTML = '<form action="about:blank" target="wep_notifyapp_ifa" method="post"></form><iframe src="javascript:false" id="wep_notifyapp_ifa" name="wep_notifyapp_ifa" frameborder="0"></iframe>';
			_form = shell.getElementsByTagName('form')[0];
			document.body.appendChild(shell);
		}
		return _form;
	};
	ds.mix({
		net: {},
		notifyApp: function(url, data, onready){
			if(typeof data === 'function'){
				onready = data;
				data = null;
			}
			this.net.open({
				url: url,
				data: data,
				onready: onready
			});
			return this;
		},
		notifyAppDone: function(){
			this.net.ready();
		}
	});
	ds.mix(ds.net, {
		_stack: [],
		_postCache: {},
		_currPost : null,
		_send: function(){
			var form, formHTML, currPost, tmpArr = [];
			if(this._currPost || !(currPost = this._stack.shift())){ return;}
			
			this._currPost = currPost;
			if(typeof currPost.data === 'object'){
				ds.each(currPost.data, function(k, val){
					tmpArr.push('input type="hidden" name="' + encodeURIComponent(k) + '" value="' + encodeURIComponent(val) + '" /');
				});
				formHTML = '<' + tmpArr.join('><') + '>';
			}
			else{
				formHTML = '<input type="hidden" name="content" value="' + encodeURIComponent(currPost.data || '') + '" />';
			}
			form = getForm();
			form.innerHTML = formHTML;
			form.action = currPost.url;
			form.submit();
		},
		open: function(url, data, callback){
			var ops = url;
			if(typeof url === 'string'){
				ops = {};
				ops.url = url;
				ops.data = data;
				ops.ondone = callback;
			}
			if(!!ops.url){
				if(typeof ops.onprocess !== 'function'){
					ops.onprocess = ds._noop;
				}
				//ops.url += ops.url.indexOf('?') > -1 ? '&' : '?';
				//ops.url += '_uuid=' + (++_uuid);
				this._postCache[ops.url] = ops;
				this._stack.push(ops);
				this._send();
			}
			return this;
		},
		ready: function(){
			var currPost = this._currPost;
			!!currPost && (currPost.onready || ds._noop).apply(this, Array.prototype.slice.call(arguments, 1));
			if(!currPost.ondone){
				this._postCache[currPost.url] = null;
			}
			this._currPost = null;
			this._send();
		},
		process: function(url, process){
			var cache, args;
			if((cache = this._postCache[url])){
				args = Array.prototype.slice.call(arguments, 1);
				args[0] = ~~args[0];
				cache.onprocess.apply(this, args);
			}
		},
		done: function(url){
			var cache = this._postCache[url];
			cache && (cache.ondone || ds._noop).apply(this, Array.prototype.slice.call(arguments, 1));
			this._postCache[url] = null;
		}
	});
})(ds);

//Global Base Params & Override ds.ready & ds.log
ds.mix((function(){
	ds.DOMReady = ds.ready;
	var 
	document = window.document,
	appReady = ds.appReady,
	domReady = false,
	_bound = false,
	_appReadyHandles = [],
	_fireHandles = function(){
		if(appReady && domReady){
			for(var i=0,len=_appReadyHandles.length; i<len; i++){
				_appReadyHandles[i].call(document);
			}
			_appReadyHandles = [];
		}
	};
	
	ds.pageBaseParams = {baseUrl:'http://game.weiphone.com/', debug:false};
	/*try{
		var tmpParams = JSON.parse(localStorage.getItem('app_base_params'));
		ds.pageBaseParams = ds.type(tmpParams) === 'object' && tmpParams.baseUrl ? tmpParams : ds.pageBaseParams;
	}catch(_){}*/
	return {
		getBaseParam: function(name){
			return this.pageBaseParams[name];
		},
		setBaseParams: function(params){
			this.mix(this.pageBaseParams, params || {}, true);
			if(!appReady){
				appReady = ds.appReady = true;
				_fireHandles();
			}
			//localStorage.setItem('app_base_params', JSON.stringify(this.pageBaseParams));
		},
		ready: function(_fn){
			if(appReady && domReady){
				typeof _fn === 'function' && _fn.call(document);
				return this;
			}
			
			typeof _fn === 'function' && _appReadyHandles.push(_fn);
			if(!_bound){
				_bound = true;
				this.DOMReady(function(){
					domReady = true;
					_fireHandles();
				});
			}
			return this;
		},
		log: (function(){
			var _log = ds.log;
			return function(){
				if((this.debug = this.getBaseParam('debug'))){
					_log.apply(this, arguments);
				}
			}
		})()
	};
})(), true);

//Global Page Functions & Params
ds.mix((function(){
	var global = window;
	return {
		//BaseViewEvent
		initBaseViewEvent: function(){
			this.on(global, 'orientationchange', function(){ ds.updateView();});
			this.on(global, 'load', function(){ ds.updateView().scrollTop();});
		},
		notifyAppPageReady: function(){
			return this.notifyApp('wp://oatu?pageReady=pageReady');
		},
		notifyAppPageError: function(message){
			return this.notifyApp('wp://oatu?pageError=pageError', {message:message});
		},
		showGlobalLoading: function(){
			return this.notifyApp('wp://oatu?loading=show');
		},
		hideGlobalLoading: function(){
			return this.notifyApp('wp://oatu?loading=hide');
		}
	};
})());

//Global lazyLoad Img
ds.ready(function(){
	var 
	_timer,
	_imgCache = {},
	view = window,
	docElem = (document.documentElement || document.body),
	startLoad = function(img){
		var item, url = img.longDesc, style = img.style;
		if(!(item = _imgCache[url])){
			item = _imgCache[url] = {
				url: url,
				status: 1, //1 - 等待加载，2 - 正在加载， 3 - 加载完成
				data: null,
				elems: []
			};
			ds.net.open({
				url: 'wp://oatu?load=img',
				data: {url: item.url},
				onprocess: function(process){
					ds.each(item.elems, function(){
						this.style.backgroundSize = process + '% 100%';
					});
				},
				ondone: function(data){
					item.data = data || {};
					loadDone(item);
				}
			});
			item.status = 2;
		}
		style.webkitTransition = 'opacity .42s ease';
		style.backgroundSize = 0;
		
		if(item.status >= 3){
			return _imgLoadDone(img, item.data);
		}
		item.elems.push(img);
	},
	_imgLoadDone = function(img, data){
		var style = img.style;
		if(data.loaded){
			style.opacity = 0.6;
			//setTimeout(function(){
				img.src = data.localUrl;
				if(!img.complete){
					img.onload = function(){
						img.onload = null;
						style.opacity = 1;
					};
				}
				else{
					style.opacity = 1;
				}
				style.backgroundSize = 0;
				style.backgroundPosition = '-2px -2px'; //Fix Safari background-size:0 Bug
				ds.addClass(img, 'loaded');
			//}, 420);
			img.setAttribute('data-loaded', 2);
		}
		else{
			img.src = this.getAttribute('data-errurl') || 'images/img_holder_fail.png';
			img.setAttribute('data-loaded', -1);
		}
	},
	loadDone = function(item){
		ds.each(item.elems, function(){
			_imgLoadDone(this, item.data);
		});
		item.elems = [];
		item.status = 3;
	},
	chkLoad = function(){
		var 
		viewHeight = docElem.clientHeight,
		imgs = ds.$('img[longdesc]:not([data-loaded])');
		
		if(imgs.length <= 0){ return; }
		
		ds.each(imgs, function(){
			if(!this.longDesc || this.src === this.longDesc){
				this.setAttribute('data-loaded', 1);
				return;
			}
			
			var rect = this.getBoundingClientRect();
			if(rect.top >= 0 && rect.top <= viewHeight || 
				rect.bottom >= 0 && rect.bottom <= viewHeight
			){
				this.setAttribute('data-loaded', 1);
				startLoad(this);
			}
		});
	};
	ds.on(view, 'scroll', function(){
		clearTimeout(_timer);
		_timer = setTimeout(chkLoad, 160);
	});
	chkLoad();
});

//Global Touch List Item
ds.ready(function(){
	var rtouch = /\s*touched\s*/g;
	ds.delegate('.list_box', 'li', 'touchstart', function(){
		var className = this.className.replace(rtouch, '');
		this.className = className != '' ? className + ' touched' : 'touched';
	})
	.delegate('.list_box', 'li', 'touchend', function(){
		this.className = this.className.replace(rtouch, '');
	});
});

//Global NotifyApp DOMReady
ds.DOMReady(function(){
	ds.notifyApp('wp://oatu?notify=DOMReady');
});

//Select Render
ds.mix({
	renderSelect: function(elem){
		if(!elem){ return this;}

		var label = ds.$('.select_label_txt', elem)[0], labelIcon = ds.$('.select_label i', elem)[0];
		var prevItem = ds.$('.select_inner li.current', elem)[0];
		ds.delegate(elem, '.select_label', 'click', function(e){
			e.stopPropagation();
			elem.className = elem.className.indexOf('select_act') > -1 ? 'select' : 'select select_act';
			ds.one(document, 'click', function(){
				elem.className = 'select';
			});
		});
		ds.delegate(elem, '.select_inner li', 'click', function(){
			if(this === prevItem){ return;}
			
			if(!prevItem){
				ds.each(ds.$('.select_inner li', elem), function(){
					this.className = '';
				});
			}
			else{
				prevItem.className = '';
			}
			prevItem = this;
			this.className = 'current';
			var iconElem = ds.$('i', this)[0];
			if(labelIcon && iconElem){
				labelIcon.className = iconElem.className;
			}
			label.innerHTML = this.innerText || this.textContent;
			elem.selectedValue = this.getAttribute('data-value');
			ds.trigger(elem, 'change');
		});
		return this;
	}
});

/**
* ds.tmpl.js
* create: 2013.01.10
* update: 2013.01.14
* admin@laoshu133.com
* @param tmpl
* @param data
**/
;(function(global,document,undefined){var ds=global.ds||(global.ds={$d:function(id){return document.getElementById(id);}});var rarg1=/\$1/g,rsquote=/\\"/g,rval=/{{([\}]+)}}/g,rschar=/("|\\|\r|\n)/g,rfuns=/<%\s*(\w+|.)(.*?)%>/g,_helper={'=':{reader:'__.push(typeof $1 === "function" ? $1.call(this) : $1);'}};ds.tmpl=function(tmpl,data){var render=new Function('_data','var __=[];__.data=_data;__.index=0;'+'with(_data){__.push("'+tmpl.replace(rschar,'\\$1').replace(rval,'<%=$1%>').replace(rfuns,function(all,type,args){args=args.replace(rsquote,'"');var tag=_helper[type];var tmp=!tag?type+args:typeof tag.reader==='function'?tag.reader.call(ds.tmpl,args):tag.reader.replace(rarg1,args);return'");'+tmp+'__.push("'})+'");}return __.join("");');return data?render.call(this,data):render;};ds.tmpl.helper=_helper;})(window,window.document);


//Debug
if(navigator.userAgent.indexOf('Chrome') > -1){
	document.documentElement.className = 'wep_debug';
	ds.setBaseParams({
		debug: (ds.debug = true),
		baseUrl: '/wegame/app/',
		openId: '12345678'
	});
	ds.mix(ds.net, (function(){
		var 
		_open = ds.net.open,
		startLoadImg = function(currPost){
			currPost.process = 0;
			currPost.localUrl = currPost.data.url;
			(function(){
				ds.net.process(currPost.url, (currPost.process += 5));
				if(currPost.process < 100){
					setTimeout(arguments.callee, 160);
				}
				else{
					setTimeout(function(){
						ds.net.done(currPost.url, {
							loaded: true,
							localUrl: currPost.localUrl
						});
					}, 160);
				}
			})();
		};
		return {
			open: function(ops){
				_open.apply(this, arguments);
				setTimeout(function(){
					var currPost = ds.net._currPost;
					ds.net.ready(currPost.url);
					
					if(String(currPost.url).indexOf('load=img') > -1){
						startLoadImg(currPost);
					}
				}, 160);
				return this;
			}
		};
	})(), true);
}