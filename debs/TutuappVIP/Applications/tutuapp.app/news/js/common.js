
;(function(global){var ds=global.ds||(global.ds={});var rarg1=/\$1/g,rgquote=/\\"/g,rbr=/([\r\n])/g,rchars=/(["\\])/g,rdbgstrich=/\\\\/g,rfuns=/<%\s*(\w+|.)([\s\S]*?)\s*%>/g,rbrhash={'10':'n','13':'r'},helpers={'=':{render:'__.push($1);'}};ds.tmpl=function(tmpl,data){var render=new Function('_data','var __=[];__.data=_data;'+'with(_data){__.push("'+tmpl.replace(rchars,'\\$1').replace(rfuns,function(a,key,body){body=body.replace(rbr,';').replace(rgquote,'"').replace(rdbgstrich,'\\');var helper=helpers[key],tmp=!helper?key+body:typeof helper.render==='function'?helper.render.call(ds,body,data):helper.render.replace(rarg1,body);return'");'+tmp+'__.push("';}).replace(rbr,function(a,b){return'\\'+(rbrhash[b.charCodeAt(0)]||b);})+'");}return __.join("");');return data?render.call(data,data):render;};ds.tmpl.helper=helpers;})(this);

/**
 * ds.net
 * author: _米
 * modified: liaoyu
 * date: 2015.10.15
**/

;(function(ds){
	'use strict';
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
		},
		openUrl: function(url, callback){
			return ds.notifyApp('wp://common?api=openUrl', {
				url: url
			}, callback);
		},
		alert: function(msg){
			if(this.debug){
				//iOS alert 后点击OK会触发touchstart事件，规避一下
				setTimeout(function(){
					alert(msg);
				}, 0);
			}
			else{
				this.notifyApp('wp://common?api=alert', {
					message: msg
				});
			}
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
			if (typeof currPost.data === 'object') {
				ds.each(currPost.data, function(k, val){
					tmpArr.push('input type="hidden" name="' + encodeURIComponent(k) + '" value="' + encodeURIComponent(val) + '" /');
				});
				formHTML = '<' + tmpArr.join('><') + '>';
			} else {
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
					ops.onprocess = ds.noop;
				}
				ops.url += ops.url.indexOf('?') > -1 ? '&' : '?';
				ops.url += '_uuid=' + (++_uuid);
				this._postCache[ops.url] = ops;

				// 测试用
				// console.log("----------start------------");
				// console.log(ops.url);		
				// console.log(ops.data || '');		
				// console.log("-----------end-------------\n\n");

				this._stack.push(ops);
				this._send();
			}
			return this;
		},
		ready: function(){
			var currPost = this._currPost;
			!!currPost && (currPost.onready || ds.noop).apply(this, Array.prototype.slice.call(arguments, 1));
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
			cache && (cache.ondone || ds.noop).apply(this, Array.prototype.slice.call(arguments, 1));
			this._postCache[url] = null;
		}
	});
})(ds);

//loadImage & lazyLoad
ds.mix((function(){
	'use strict';
	var loadCaches = {};
	function _loadImage(url, onload){
		var img = new Image();
		img.onload = img.onerror = function(e){
			img = null;
			var ret = {loaded:true, localUrl:url};

			// 下面代码会出现图片已下载到IOS，但 e.type 为 error
			// if(e.type !== 'load'){
			// 	ret.localUrl = 'about:blank';
			// 	ret.loaded = false;
			// }

			if(typeof onload === 'function'){
				onload(ret);
			}
		};
		img.src = url;
	}

	var 
	checkTimer,
	view = window,
	docElem = (document.documentElement || document.body),
	checkBound = false, lazyTasks = [];

	function checkHandler(){
		var img, rect, task, viewHeight = docElem.clientHeight;

		// 遍历task
		for(var i = 0; i < lazyTasks.length; i++){
			task = lazyTasks[i];

			// 遍历每一个task里边的图片数组
			for(var j = 0; j < task.elems.length; j++){
				img = task.elems[j];
				if(img.nodeName !== 'IMG'){
					task.elems.splice(j, 1);
					j--;
					task.count = task.elems.length;
					continue;
				}

				rect = img.getBoundingClientRect();
				if(rect.top >= 0 && rect.top <= viewHeight || 
						rect.bottom >= 0 && rect.bottom <= viewHeight) {
					(function(task, img){

						ds.loadImage(img.longDesc, function(data){
							img.setAttribute('data-loaded', data.loaded ? 2 : -1);
							if(task.onload.call(img, data) !== false){
								img.src = data.localUrl;
							}
						}, function(process, queue) {
							task.onprocess.call(img, process);
						});

					})(task, img);

					task.elems.splice(j, 1);
					j--;
					img.setAttribute('data-loaded', 1);
					if(++task.loaded >= task.count){
						lazyTasks.splice(i, 1);
						i--;
					}
				}
			}
		}
	}
	return {
		loadImage: function(url, onload, onprocess){
			var queue = loadCaches[url];
			if(!(queue = loadCaches[url])){
				queue = loadCaches[url] = {
					onprocess: [],
					onloads: [],
					data: null,
					url: url,
					status: 0 //0 - 等待加载，1 - 正在加载， 2 - 加载完成
				}
				this.net.open({
					data: {url: url},
					url: 'wp://common?api=loadImage',
					onprocess: function(process){
						queue.process = process;
						ds.each(queue.onprocess, function(){
							this.call(ds, process, queue);
						});
					},
					ondone: function(data){
						queue.status = 2;
						function loadDone(){
							ds.each(queue.onloads, function(){
								this.call(ds, queue.data, queue);
							});
							queue.onprocess = queue.onloads = [];
						}

						if(!data || !data.loaded){
							queue.data = {loaded:false, localUrl:'about:blank'};
							loadDone();
						}
						else{
							_loadImage(data.localUrl, function(data){
								queue.data = data;
								loadDone();
							});
						}
					}
				});
				queue.status = 1;
			}
			if(queue.status < 2){
				if(typeof onprocess === 'function'){
					queue.onprocess.push(onprocess);
				}
				if(typeof onload === 'function'){
					queue.onloads.push(onload);
				}
			}
			else{
				if(typeof onload === 'function'){
					onload.call(ds, queue.data, queue);
				}
			}
			return this;
		},
		lazyLoad: function(imgs, onload, onprocess){
			var elems = [];
			if(typeof imgs === 'string'){
				elems = ds.$(imgs);
			}
			else if(imgs.length){
				elems = imgs;
			}
			else if(imgs.nodeName === 'IMG'){
				elems.push(imgs);
			}
			if(!elems || !elems.length){ return this; }
			elems = [].slice.call(elems);

			var task = {
				loaded: 0,
				elems: elems,
				count: elems.length,
				onload: onload || ds.noop,
				onprocess: onprocess || ds.noop
			};
			lazyTasks.push(task);

			if(!checkBound){
				checkBound = true;
				ds.on(view, 'scroll', function(){
					clearTimeout(checkTimer);
					checkTimer = setTimeout(checkHandler, 160);
				});
			}
			checkHandler();
			return this;
		},
		//此方法抛出给APP调用，规避APP重写滚动条，不触发scroll事件
		dispatchScrollEvent: function(){
			var evt = document.createEvent('Event');
			evt.initEvent('scroll', true, true);
			
			window.dispatchEvent(evt);
		}
	};
})());

//extend ui
ds.mix((function(){
	'use strict';
	function initTouch(){
		ds.on(this, 'touchmove', cancelTouch);
		ds.on(this, 'touchend', cancelTouch);
		ds.addClass(this, 'touched');

		function cancelTouch(){
			ds.un(this, 'touchmove', cancelTouch);
			ds.un(this, 'touchend', cancelTouch);
			ds.removeClass(this, 'touched');
		}
	}
	return {
		touchTarget: function(elem, selector){
			if(!selector){
				return this.on(elem, 'touchstart', initTouch);
				
			}
			return this.delegate(elem, selector, 'touchstart', initTouch);
		}
	};
})());

//bbsapp & exts
ds.mix((function(){
	'use strict';
	var 
	global = window,
	floorAlias = ['楼主', '沙发', '板凳', '地板', '地下室'],
	filledCallbacks = [];
	return {
		//BaseViewEvent
		initBaseViewEvent: function(){
			this.on(global, 'orientationchange', function(){ ds.updateView();});
			this.on(global, 'load', function(){ ds.updateView().scrollTop();});
		},
		fillCount: 0,
		fillData: null,
		fill: function(data){
			var 
			shell = ds.$d('fill_content'),
			tmpl = ds.$d('content_fill_tmpl');
			if(data && shell && tmpl){
				data.pageSize = data.pageSize || 10;
				this.isAdmin = data.isAdmin = !!data.isAdmin;
				//this.isAdmin = data.isAdmin = true;
				shell.innerHTML = ds.tmpl(tmpl.value, data);
				
				this.scrollTop();
			}
			this.fillData = data;
			this.fillCount++;

			ds.each(filledCallbacks, function(){
				this.call(ds, data, ds.fillCount);
			});
			//filledCallbacks = [];
		},
		onFill: function(callback){
			if(typeof callback === 'function'){
				filledCallbacks.push(callback);
			}
			return this;
		},
		formatRemainDate: function(ms, format){
			format = format || '{d}天{h}小时{m}分钟';
			ms = parseInt(ms, 10) || 0;
			var 
			dr = 1000*60*60*24, d = ~~(ms/dr),
			hr = 1000*60*60, h = ~~((ms-d*dr)/hr),
			mr = 1000*60, m = ~~((ms-d*dr-h*hr)/mr),
			sr = 1000, s = ~~((ms-d*dr-h*hr-m*mr)/sr);
			return format.replace(/\{d\}/g, d).replace(/\{h\}/g, h)
				.replace(/\{m\}/g, m).replace(/\{s\}/g, s);
		},
		formatExpireDate : function(expireDate) {
			var startDate = new Date().getTime();
			var endDate = parseInt(expireDate, 10) * 1000;
			var remainTime = endDate - startDate;

			//计算相差天数
			var days=Math.floor(remainTime/(24*3600*1000));
			 
			//计算小时数
			var leave1=remainTime%(24*3600*1000);    //计算天数后剩余的毫秒数
			var hours=Math.floor(leave1/(3600*1000));

			//计算相差分钟数
			var leave2=leave1%(3600*1000);        //计算小时数后剩余的毫秒数
			var minutes=Math.floor(leave2/(60*1000));

			//计算相差秒数
			var leave3=leave2%(60*1000);      //计算分钟数后剩余的毫秒数
			var seconds=Math.round(leave3/1000);

			return days + '天'+ hours +'小时'+ minutes +'分钟'+ seconds +'秒';
		},
		fixFloor: function(floor){
			var inx = ~~floor - 1;
			return floorAlias[inx] ? '<em>' + floorAlias[inx] + '</em>' : '<em>' + (inx+1) + '楼</em>';
		},
		fixFloor111: function(inx, page, pageSize){
			var inx = pageSize * page + inx;
			return floorAlias[inx] ? '<em>' + floorAlias[inx] + '</em>' : '<em>' + inx + '楼</em>';
		},
		fixContentImg: (function(){
			var 
			rimg = /<img([^>]+)>/ig,
			rsrc = /(?:\ssrc\s*=\s*"([^"]+))/i,
			rhdsrc = /(?:\sdata-hdsrc\s*=\s*"([^"]+))/i,
			rsmile = /(?:\salt\s*=\s*"smile")/i;
			return function(content, onmatch){
				var self = this, imgUrls = this.imgUrls;
				if(typeof onmatch !== 'function'){
					onmatch = ds.noop;
				}
				content = content.replace(rimg, function(a, p){
					if(rsrc.test(p)){
						var src = RegExp.$1, ret = onmatch(src, p, a), hdsrc = '';

						// hd src
						if (rhdsrc.test(p)) {
							hdsrc = ' data-hdsrc="' + RegExp.$1 + '" ';
						}

						if(ret === void 0){
							ret = rsmile.test(p) ? 
								'<img class="smile" alt="smile" src="./images/place.png" longdesc="' + src + '" width="25" height="25">' :
								'<figure class="pic"><img class="pic_hold" alt="" src="./images/img_holder.png" longdesc="' + src + '"'+ hdsrc +'></figure>';
						}
						return ret;
					}
					return '';
				});
				return content;
			};
		})(),
		parseVideo: function(content, showPic){
			var 
			rstyle = /\sstyle=["']?[^"'>]+["']?/g,
			rvideo = /<(video)[^>]*>[\s\S]*?<\/\1>/g,
			rcontrols = /\scontrols(?:=["']?[^"'>]*["']?)?/g,
			preloadStr = ' preload="none"';

			if (showPic) {
				preloadStr = '';
			}

			return content.replace(rvideo, function(tag){
				tag = tag.replace(rstyle, ''); //.replace(rcontrols, '');
				tag = tag.replace('>', preloadStr + ' controls webkit-playsinline>'); //preload, controls, inline play
				return '<div class="video_panel">' + tag + '<div class="video_btn"><i class="icon"></i></div></div>';
			});
		},
		parseLetv: function(content, showPic) {
			var rletv = /<(app-letv)[^>]*>[\s\S]*?<\/\1>/g,
				rurl = /(?:\sdata-url\s*=\s*"([^"]+))/i;

			return content.replace(rletv, function(tag, p){
				if (rurl.test(tag)) {
					var winWidth = document.documentElement.clientWidth,
						letvWidth = winWidth > 640 ? 620 : (winWidth - 20),
						sourceUrl = RegExp.$1,
						sourceUrl = sourceUrl.replace(/&width=\d+/, '').replace(/&height=\d+/, ''),
						letvSrc;

					if (sourceUrl.indexOf && sourceUrl.indexOf('?') != -1){
						letvSrc = sourceUrl + '&width='+ letvWidth +'&height=200&feng_videotype=letv';
					} else {
						letvSrc = sourceUrl + '?feng_videotype=letv';
					}

					return '<div class="letv_panel"><iframe src="'+ letvSrc +'" width="'+ letvWidth +'" height="200" frameborder="0"></iframe></div>';
				}
			});
		},
		fixIframeSrc: function(content) {
			var riframe = /<(iframe)[^>]*>[\s\S]*?<\/\1>/g,
				rsrc = /(?:\ssrc\s*=\s*"([^"]+))/i;

			return content.replace(riframe, function(tag, p){
				if (rsrc.test(tag)) {
					var sourceSrc = RegExp.$1;
					/*var winWidth = document.documentElement.clientWidth,
						iframeWidth = winWidth > 640 ? 620 : (winWidth - 20),
						sourceSrc = RegExp.$1,
						iframeSrc = sourceSrc,
						lastChar = sourceSrc.charAt(sourceSrc.length - 1);

					if (sourceSrc.indexOf && sourceSrc.indexOf('?') != -1) {
						if (lastChar != '&' && lastChar != '?') {
							iframeSrc += '&';
						}
						iframeSrc += 'feng_videotype=letv';
					} else {
						iframeSrc += '?feng_videotype=letv';
					}

					return '<div class="iframe_panel"><iframe src="'+ iframeSrc +'" width="'+ iframeWidth +'" height="0" name="bbs4_iframe" id="bbs4_iframe" border="0" frameborder="no" scrolling="no"></iframe></div>';*/
					return '<a class="viewPCVersionBtn" href="'+ sourceSrc +'">查看PC版</a>';
				}
			});
		},
		fixContent: (function(){
			var rcleartags = /<\/?(strong)>/ig,
			rShortBr = /(<br\s?\/?>(\n)*(\s)*){2,}/ig,
			rAllBr = /<br\s?\/?>/ig;

			return function(content, ops){
				ops = ops || {};
				//移除一些标签
				if (!ops.noClearTags) {
					content = content.replace(rcleartags, '').replace(/^\s*(<br \/>\n?\s*)+|(<br \/>\n?\s*)+\s*$/ig, '');
				}
				//移除行内样式
				content = content.replace(/style=".*?"/ig, '').replace(/size=".*?"/ig, '').replace(/face=".*?"/ig, '').replace(/align=".*?"/ig, '');
				//阻止iframe跳转
				content = this.fixIframeSrc(content);
				//图片、表情
				content = this.fixContentImg(content, ops.onimgmatch);
				//视频
				content = this.parseVideo(content, ops.showPic);
				//app-letv解析
				content = this.parseLetv(content, ops.showPic);
				//俩个以上br换成自定义换行
				content = content.replace(rShortBr, '<div class="split-line"></div>');
				content = content.replace(rAllBr, '<div></div>');
				return content;
			}
		})(),
		fixContentNoFirstImg: (function(){
			var rFirstImg = /<(img)[^>]*>/i,
			rBlankLink = /<a[^>]*>\s*<\/img>\s*<\/a>/ig,
			rShortBr = /(<br\s?\/?>(\n)*){2,}/ig,
			rAllBr = /<br\s?\/?>/ig;
			
			return function(content, ops){
				ops = ops || {};
				//去掉前后换行
				content = content.replace(/style=".*?"/ig, '').replace(/align=".*?"/ig, '');
				//移除第一张新闻图片
				if (ops.bannerSrc) {
					if (ds.getElementAttr(content, 'img', 'src') == ops.bannerSrc) {
						content = content.replace(rFirstImg, '');
					}
				}
				//阻止iframe跳转
				content = this.fixIframeSrc(content);
				//图片、表情
				content = this.fixContentImg(content, ops.onimgmatch);
				//视频
				content = this.parseVideo(content, ops.showPic);
				//app-letv解析
				content = this.parseLetv(content, ops.showPic);
				//移除空的链接
				content = content.replace(rBlankLink, '');
				//俩个以上br换成自定义换行
				content = content.replace(rShortBr, '<div class="split-line"></div>');
				content = content.replace(rAllBr, '<div></div>');

				return content;
			}
		})(),
		fixQuote: function(quote){
			var 
			maxLen = 72,
			rtag = /<[^>]+>/g,
			//rbr = /(?:<br[^>]*>\s*)+/g,
			ret = this.fixContent(quote).replace(rtag, '');
			return ret.length > maxLen ? ret.slice(0, maxLen)+'...' : ret;
		},
		fixRateContent: function(content){
			return content.replace(/<[^>]+>/g, '');
		},
		fixNewsContent: (function(){
			var 
			rtag = /<(\/?\w+)([^>]*)>/g,
			//保留部分标签
			rkeeptags = /^(?:a|p|br|img|span|i|em|strong|ul|ol|li|video)$/,
			rcleartags = /<(script|embed|object)[^>]*>[\s\S]*<\/\1>/g,
			rstyle = /\sstyle=["']?[^"'>]+["']?/g;
			return function(news){
				var ret = String(news)
				//清空部分标签
				.replace(rcleartags, '')
				//具体解析每个标签
				.replace(rtag, function(a, name, body){
					name = name.toLowerCase();
					//只保留白名单
					if(rkeeptags.test(name.replace('/', ''))){
						if(body){
							body = body.toLowerCase();
							//过滤style属性
							body = body.replace(rstyle, '');
						}
						return '<' + name + body + '>';
					}
					return '';
				});
				return this.fixContent(ret, {
					onimgmatch: this.onNewsImgMatch
				});
			};
		})(),
		formatHotCount : function(num) {
			if (typeof num == 'undefined') {
				return 0;
			}
			
			num = num + '';
			if (num.indexOf('-') > -1 || num.indexOf('+') > -1) {
				return num;
			} else {
				return '+' + num;
			}
		},
		//ADS 新版广告路径为图片
		fillAds: function(ads){
			if(!ads || !ads.length){ return; }

			var adTmpl = '<div style="width: 100%; height: 100%; background: url({url}) no-repeat; background-size: 100% 100%;" class="adsPanel" ></div>';

			this.each(ads, function(){
				var panel = ds.$d('wea_d_' + this.id);

				if(panel){
					var html = '<a href="javascript:;" class="close" data-id="' + this.id + '">×</a>';
					panel.innerHTML = adTmpl.replace('{url}', this.url) + html;
					panel.style.display = 'block';
				}
			});
		},
		/*fillAds: function(ads){
			if(!ads || !ads.length){ return; }
			var 
			css = 'height:100%;width:100%;' + (ds.debug?'-webkit-transform:scale(2);-webkit-transform-origin:50% 0':''),
			adTmpl = '<iframe width="100%" height="100%" style="'+ css +'" src="{url}" scrolling="no" frameborder="0" class="adsIframe"></iframe>';
			this.each(ads, function(){
				var panel = ds.$d('wea_d_' + this.id);
				if(panel){
					var html = '<a href="javascript:;" class="close" data-id="' + this.id + '" style="position: absolute; right: 20px; top: 10px;">×</a>';
					panel.innerHTML = adTmpl.replace('{url}', this.url) + html;
					ds.one(ds.$('iframe', panel)[0], 'load', function(){
						ds.un(this, 'load', arguments.callee);
						panel.style.display = 'block';
					});
					ds.delegate(panel, 'a.close', 'click', function(e){
						e.preventDefault();

						panel.innerHTML = '';
						panel.style.display = 'none';
						ds.notifyApp('wp://forum?api=closeAD', {
							id: this.getAttribute('data-id')
						});
					});
				}
			});
		},*/
		getItemIndexByElem: function(elem){
			var inx = -1;
			while(elem && elem.nodeName.toUpperCase() !== 'ARTICLE'){
				elem = elem.parentNode;
			}
			if(elem && elem.getAttribute('data-index')){
				inx = parseInt(elem.getAttribute('data-index'), 10);
			}
			return inx >= 0 ? inx : -1;
		},
		getItemDataByElem: function(elem){
			var inx = this.getItemIndexByElem(elem);
			return this.getItemData(inx);
		},
		getItemData: function(inx){
			var data = this.fillData;
			if(data && data.dataList){
				return data.dataList[inx] || null;
			}
			return null;
		},
		showUserInfo: function(uid, username){
			ds.notifyApp('wp://common?api=showUserInfo', {
				username: username,
				uid: uid
			});
		},
		showRate: function(trigger){
			var data = this.getItemDataByElem(trigger);
			if(data && data.rates){
				ds.notifyApp('wp://forum?api=showRate', {
					id: data.id,
					floor: data.floor,
					threadData: JSON.stringify(data)
				});
			}
		},
		setFontSize: function(size){
			var style = ds.$d('font_size_style');
			if(style){
				// 小号 30   中号 34  大号 38   超大号 42   巨大号 48
				size = (~~size - 34)/2 + 14;
				
				style.innerHTML = '#fill_content{font-size:' + size + 'px;} #comments{font-size:' + size + 'px;}';
			}
		},
		enableNightMode: function(){
			ds.addClass(document.documentElement, 'night_mode');
		},
		disableNightMode: function(){
			ds.removeClass(document.documentElement, 'night_mode');
		},
		showPageError: function(msg, info){
			var 
			shell = ds.$d('fill_content'),
			html = '<div class="title error"><h1>' + (msg||'Loading...') + '</h1></div>';
			if(!!info){
				html += '<div class="inner error">' + info + '</div>';
			}
			shell.innerHTML = html;
		},
		getScanPosition: function(){
			var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

			return scrollTop;
		},
		setScanPosition: function(pos){
			this.scrollTo(pos);
		},
		getElementAttr: function(content, tag, attr, pos) {
			if (typeof pos == 'undefined') {
				pos = 0;
			}

			var tmpWrap = document.createElement('div');
			tmpWrap.innerHTML = content;
			var firstImage = tmpWrap.getElementsByTagName(tag)[pos];
			return firstImage.src;
		},
		copyStringByNum: function(str, num) {
			var result = '';
			for (var i=0; i<num; i++) {
				result += str;
			}

			return result;
		},
		fixStar: function(num) {
			var star1 = '<span class="icon-star s1"></span>',
				star2 = '<span class="icon-star s2"></span>',
				star3 = '<span class="icon-star"></span>',
				result = '';

			var num = num + '',
				star1Num = 0,
				star2Num = 0,
				star3Num = 0;
			
			if (num.indexOf('.5') != -1) {
				star2Num = 1;
			}
			star1Num = parseInt(num);
			star3Num = 5 - star1Num - star2Num;

			result = this.copyStringByNum(star1, star1Num) + this.copyStringByNum(star2, star2Num) + this.copyStringByNum(star3, star3Num);

			return result;
		}
	};
})(), true);

//Global NotifyApp DOMReady
ds.ready(function(){
	ds.notifyApp('wp://forum?api=DOMReady');
});


// debug - log shell
ds.mix((function(){
	'use strict';
	var logElem;
	return {
		logOnScreen: function(msg){
			if(!logElem){
				logElem = document.createElement('div');
				logElem.className = 'ds_log_shell';
				document.body.appendChild(logElem);
				
				logElem.onclick = function(){
					this.innerHTML = '';
				};
			}
			logElem.innerHTML += '<p>' + msg + '</p>';
		}
	};
})());

// debug - load image
(function(){
	var script = ds.$('script');
	script = script[script.length - 1];
	ds.debug = !!(navigator.userAgent.indexOf('Chrome') > -1 || script.getAttribute('debug'));
	if(!ds.debug){ return; }

	ds.addClass(document.documentElement, 'wep_debug');

	ds.mix(ds.net, (function(){
		var 
		_open = ds.net.open,
		startLoadImg = function(currPost){
			currPost.process = 0;
			currPost.localUrl = currPost.data.url;
			(function(){
				ds.net.process(currPost.url, (currPost.process += 5));
				if (currPost.process < 100) {
					setTimeout(arguments.callee, 50);
				} else {
					setTimeout(function(){
						ds.net.done(currPost.url, {
							loaded: true,
							localUrl: currPost.localUrl
						});
					}, 50);
				}
			})();
		};
		return {
			open: function(ops){
				// console.log('ds.net.open:', ops.url, ops.data||'');
				_open.apply(this, arguments);
				setTimeout(function(){
					var currPost = ds.net._currPost;
					ds.net.ready(currPost.url);
					
					if(String(currPost.url).indexOf('api=loadImage') > -1){
						startLoadImg(currPost);
					}
				}, 50);
				return this;
			}
		};
	})(), true);
})();