// 图片、头像加载，查看大图
var loadingUrl = './images/img_holder_loading.png',
    urlStrCache = '',
    showPic = 0,
    showIcon = 0,
    errorFlag = false,
    contentLoaded = false,
    asyncLoaded = false,
    firstFlag = true,
    pid;    // 新闻ID

// 检测图片带链接
var rimglink = /\.(?:png|jpg|gif|svg|jpeg)(?:$|\?)/i;

function getImgLink(img){
    var c = 0, link  = img.parentNode;
    while(c++ < 3 && link.nodeName.toLowerCase() !== 'a') {
        link = link.parentNode;
    }
    if (link.nodeName.toLowerCase() === 'a') {
        if (rimglink.test(link.href)) {
            link.href = 'javascript:;';
        } else {
            return link.href;
        }
    }
    return null;
}

// 查看大图
function showGallery(img){
    var rect = img.getBoundingClientRect();
    ds.notifyApp('wp://forum?api=showPic', {
        urls: urlStrCache,
        currSrc: img.src,
        index: ~~img.getAttribute('data-index'),
        height: rect.height || img.offsetHeight,
        width: rect.width || img.offsetWidth,
        left: rect.left,
        top: rect.top
    });
}

//（重新）初始化图片加载等
function initPicHandler(shell){
    var inx = 0,
        shellPics = ds.$('.b_content img, .c_content img, .topBannerImg', shell),
        smileTextNode = document.createTextNode('[表情]'),
        urlArrCache = [];

    ds.each(shellPics, function(i) {

        if (this.className && this.className.indexOf('pic_hold') > -1) {
            if (showPic) {
                this.src = loadingUrl;
            }
            
            // 如果有链接是否允许跳转，且不加入查看大图
            var link = getImgLink(this);
            if (!!link && link !== 'javascript:;') {
                this.setAttribute('data-link', link);
            } else {
                var hdsrc = this.dataset.hdsrc || this.longDesc;

                if (this.className.indexOf('topBannerImg') == -1) {
                    urlArrCache.push(encodeURIComponent(hdsrc));
                    this.setAttribute('data-index', inx++);
                }

            }
        } else {
            if (!showPic && this.alt === 'smile') {
                this.parentNode.replaceChild(smileTextNode.cloneNode(), this);
            }
        }
    });
    urlStrCache = urlArrCache.join(',');

    // 图片加载
    if (showPic) {
        ds.lazyLoad(shellPics, function(data){
            this.style.backgroundSize = '';
            if (this.className && this.className.indexOf('pic_hold') > -1) {
                this.className = '';
            }

        }, function(process) {
            this.style.backgroundSize = '100% ' + (80-process) + '%';
        });
    }

    if (showIcon) {
        // 头像加载
        ds.lazyLoad(ds.$('header img', shell), function(){
            ds.addClass(this.parentNode, 'active');
        });

        // app icon download
        ds.lazyLoad(ds.$('.pic-box img', shell), function(){
            
        });
    }
}

// 加载新闻顶部图片
function loadBannerImg(){
    var bannerImg = $('.topBannerImg'),
        realSrc = bannerImg.attr('longdesc');

    if (!realSrc) {
        return;
    }

    bannerImg.attr('data-loaded', 1);

    ds.notifyApp('wp://common?api=loadFirstImage', {
        url : bannerImg.attr('longdesc')
    });

}

$(function(){
    ds.initBaseViewEvent();
    var shell = $('#content');

    ds.mix({
        fillComments: function(data) {
            var tmpl = $('#comments_tmpl').val(),
                comments = $('#comments'),
                hotComments = $('#hot-comments'),
                newComments = $('#new-comments');

            if (typeof data.currPage == 'undefined' || data.currPage == 1) {
                if (data.comments.length < 1) {
                    comments.css('border', 'none');
                    return;
                }

                if (!asyncLoaded) {
                    comments.hide();
                    $('#hot-comments').empty();
                    $('#new-comments').empty();
                }

                if (contentLoaded) {
                    comments.show();
                }

                if(data && data.comments){
                    if (data.commentType == 1) {
                        hotComments.html(ds.tmpl(tmpl, data));
                    } else if (data.commentType == 2) {
                        newComments.html(ds.tmpl(tmpl, data));
                    }
                    asyncLoaded = true;
                }
            } else {
                asyncLoaded = false;
                contentLoaded = false;

                $('#fill_content').empty();
                hotComments.empty();

                showPic = data.showPic || 1;
                data.commentType = 2;
                newComments.html(ds.tmpl(tmpl, data));
                newComments.find('.new-c-title').hide();
                $('.error.title').remove();
                comments.show().addClass('p2');

                // 指定楼层
                var target, id = data ? data.currFloorId : 0;

                if (id && (target = ds.$d('thread_' + id))) {
                    setTimeout(function(){
                        ds.scrollTo(target.getBoundingClientRect().top);
                    }, 50);
                }
            }


            initPicHandler(shell[0]);

        },
        fixScore : function(score) {
            var arr = String(score).split('.');
            if (arr.length == 1) {
                if (score == '') { 
                    return '0';
                }
                return score + '.<i>0</i>';
            } else if (arr.length > 1) {
                return arr[0] + '.<i>' + arr.slice(1).join('.') + '</i>';
            } else {
                return score;
            }
        },
        fillBannerImg : function(imgSrc) {
            var bannerImg = $('.topBannerImg');
            bannerImg.attr('src', imgSrc);
            bannerImg.attr('data-loaded', 2);
        },
        fillAds : function(ads) {
            if (!ads || !ads.length) {
                return;
            }

            for (var i=0, len=ads.length; i < len; i++) {
                var ad = ads[i],
                    panel = $('#wea_d_' + ad.id),
                    adTmpl = '<div style="width: 100%; height: 100%; background: url({url}) no-repeat; background-size: 100% 100%;" class="adsPanel" /><span class="ads-label"></span>';
                
                if (panel.length > 0) {
                    panel.html(adTmpl.replace('{url}', ad.url));
                    panel.show();
                }
            }
        },
        parseTopVideo : function(bannerSrc, video_type) {
            // 获取屏幕宽高
            var videoWidth,
                videoHeight;

            if (video_type == 1 || video_type == 2) {
                videoWidth = document.documentElement.clientWidth > 640 ? 640 : document.documentElement.clientWidth;
                videoHeight = videoWidth / 1.6;

                if (video_type == 1) {
                    bannerSrc = bannerSrc.replace(/&width=\d+/, '').replace(/&height=\d+/, '');
                    bannerSrc = bannerSrc + '&width='+ videoWidth +'&height='+ videoHeight +'&feng_videotype=letv';
                } else {
                    if (bannerSrc.indexOf && bannerSrc.indexOf('?') != -1) {
                        bannerSrc += '&feng_videotype=youku';
                    } else {
                        bannerSrc += '?feng_videotype=youku';
                    }
                }
                

                return  '<div class="news-banner video"><iframe src="'+ bannerSrc +'" width="'+ videoWidth +'" height="'+ videoHeight +'" frameborder="0"></iframe></div>';
            } else if (video_type == 3) {
                var proloadStr = '';
                if (showPic) {
                    proloadStr = 'preload="none"';
                }
                return '<div class="news-banner video"><video controls="" width="100%" '+ proloadStr +' webkit-playsinline><source src="'+ bannerSrc +'"></video></div>';
            }
        },
        forward2cmt : function() {
            var top = $('#comments').offset().top;
            ds.scrollTo(top);
        },
        fixStarNum : function(num) {
            num = Math.round(num);
            var result = parseInt(num / 2);

            if (num % 2 > 0) {
                result += 0.5;
            }

            if (result >= 0) {
                return result;
            } else {
                return 0;
            }
        }
    }, true);

    // 显示用户信息
    shell.on('tap', '.avatar, span.username', function(e){
        ds.showUserInfo(this.dataset.uid, this.dataset.username);
    });

    // 软件下载 
    shell.on('tap', '.download-btn', function(e){
        ds.notifyApp('wp://forum?api=downloadApp', {
            pid : this.dataset.pid,
            appId : this.dataset.appId
        });
    });

    // 点击评论
    shell.on('tap', '.cmt-content', function(e){
        var rect = this.getBoundingClientRect();

        if (e.target && e.target.tagName.toLowerCase() === 'a') {
            return;
        }

        ds.notifyApp('wp://forum?api=threadMore', {
            pid : pid,
            cid : this.dataset.cid,
            cuid : this.dataset.cuid,
            floor : this.dataset.floor,
            parentId : this.dataset.parentId || '',
            parentUid : this.dataset.parentUid || '',
            parentUsername : this.dataset.parentUsername || '',
            username : decodeURIComponent(this.dataset.username),
            postDate : this.dataset.postDate,
            comment : decodeURIComponent(this.dataset.comment),
            height: rect.height || this.offsetHeight,
            width: rect.width || this.offsetWidth,
            left: rect.left,
            top: rect.top
        });
    });

    // 对评论进行点赞
    shell.on('tap', '.praise-btn', function(e){
        ds.notifyApp('wp://forum?api=threadPraise', {
            pid : pid,
            cid : this.dataset.cid,
            cuid : this.dataset.cuid,
            floor : this.dataset.floor,
            parentId : this.dataset.parentId || '',
            parentUid : this.dataset.parentUid || '',
            parentUsername : this.dataset.parentUsername || '',
            username : decodeURIComponent(this.dataset.username),
            postDate : this.dataset.postDate,
            comment : decodeURIComponent(this.dataset.comment)
        });
    });

    // 对评论进行踩
    shell.on('tap', '.tread-btn', function(e){
        ds.notifyApp('wp://forum?api=threadTread', {
            pid : pid,
            cid : this.dataset.cid,
            cuid : this.dataset.cuid,
            floor : this.dataset.floor,
            parentId : this.dataset.parentId || '',
            parentUid : this.dataset.parentUid || '',
            parentUsername : this.dataset.parentUsername || '',
            username : decodeURIComponent(this.dataset.username),
            postDate : this.dataset.postDate,
            comment : decodeURIComponent(this.dataset.comment)
        });
    });

    // 查看大图，手动加载图片
    shell.on('tap', 'figure.pic img', function(e){
        var link = this.getAttribute('data-link');
        // 打开链接
        if (!!link) {
            ds.openUrl(link);
        } else if (~~this.getAttribute('data-loaded') !== 0){   //查看大图
            if (this.alt !== 'smile') {
                showGallery(this);
            }
        } else {
            var self = this;

            this.src = loadingUrl;

            ds.loadImage(this.longDesc, function(data){
                self.className = '';
                self.src = data.localUrl;
                self.style.backgroundSize = '';
                
                self.setAttribute('data-loaded', data.loaded ? 2 : -1);     // 2 代表加载完成 -1 表示加载失败 1 表示正在加载
            }, function(process){
                self.style.backgroundSize = '100% ' + (80-process) + '%';
            });

            this.setAttribute('data-loaded', 1);
        }
    });

    // listener trigger fill content

    var common_tmpl = $('#common_fill_tmpl').val(),
        software_list_tmpl = $('#software_list_fill_tmpl').val();

    ds.onFill(function(data, fillCount){
        var detailContent = "";

        contentLoaded = true;

        if (data && data.dataList) {
            // 缓存配置数据
            showPic = data.showPic;
            showIcon = data.showIcon;

            if (data.nightmode == 1) {
                ds.enableNightMode();
            }

            if (data.fontSize > 0) {
                ds.setFontSize(data.fontSize);
            }

            try {

                pid = data.dataList.pid;
                
                if (data.contentType == 2) {
                    detailContent = ds.tmpl(software_list_tmpl, data.dataList);
                } else {
                    detailContent = ds.tmpl(common_tmpl, data.dataList);
                }

            } catch(e) {
                console.log(e);
                errorFlag = true;
            }

            if (errorFlag) {
                ds.showPageError('Oops!!', '请稍后重试');
                errorFlag = false;
            } else {

                $('#fill_content').html(detailContent);

                if (!asyncLoaded) {
                    $('#hot-comments').empty();
                    $('#new-comments').empty();
                }
                $('#comments').show().removeClass('p2');
            }

            // 新闻顶部图片加载
            // if (showPic && data.dataList.bannerSrc) {
            //     loadBannerImg();
            // }
            
        }


        initPicHandler(shell[0]);

        // 指定楼层
        var target, id = data ? data.currFloorId : 0;

        if (id && (target = ds.$d('thread_' + id))) {
            setTimeout(function(){
                ds.scrollTo(target.getBoundingClientRect().top);
            }, 50);
        }       
    });

});

// 页面是所有@用户链接跳转
$(function(){
    $(document).on('click', 'a', function(e){

        var ref_href = $(this).attr('href'),
            ref_text = $(this).text();

        if (ref_href.length > 1 && ref_text.length > 1 && ref_text.charAt(0) == '@' && ref_href.indexOf('uid=') != -1 ) {
            // 解析用户名和uid
            var ref_uid,
                ref_username = ref_text.substr(1),
                ruid = /&uid=(\d+)(&|$)/;

            if (ruid.test(ref_href)) {
                ref_uid = RegExp.$1;
                
                if (ref_uid.length > 0) {
                    ds.showUserInfo(ref_uid, ref_username);
                    e.preventDefault();
                }
            }
        }
    });
});

// 页面数据填充
ds.ready(function(){
    // 通用详情页
    /*ds.fill({
        currPage: 1,
        pageSize: 10,
        showIcon: 1,        // 1 yes  0 no
        showPic: 1,         // 1 yes  0 no
        fontSize: 34,
        nightmode : 0,      // 1 yes  0 no
        currFloorId : "6x", // 代表要跳转到楼层ID
        contentType: 1,     // 1 通用新闻   2 新闻合集
        dataList : {
            bannerSrc : 'http://g.hiphotos.baidu.com/zhidao/pic/item/9f510fb30f2442a79fbc68ded343ad4bd113021e.jpg', // 如果没有顶部图片或视频使用空字符串
            pid : '457845457',  // 新闻ID
            category: '资迅',
            title: '6块钱拿下这个精品 《纪念碑谷》今日冰点',
            postDate: '2015-04-25  09:54',
            author: 'Nickcannon',
            content: '说起台湾游戏厂商雷亚，许多玩家首先想到的就是他们所推出精美的音乐游戏CytusDeemo除此之外雷亚，之前推出的动作类手游聚爆，也获得了不少玩家的好评不过在此前举办的雷亚嘉年华上他们公布了，其制作的音乐新游VOEZ近日游戏启动了激活码预约活动。<img src="http://g.hiphotos.baidu.com/zhidao/pic/item/9f510fb30f2442a79fbc68ded343ad4bd113021e2.jpg" ></img><strong>您</strong>查看<app-letv data-url="http://player.youku.com/embed/XMTM4NTQwNDQ5Mg==" style="display:none;"></app-letv>的专题文章<app-letv data-url="http://yuntv.letv.com/bcloud.html?uu=0330d88456&vu=ae5683491c&pu=35f7918307&auto_play=0&gpcflag=1&width=600&height=400" style="display:none;"></app-letv>暂时没有移动版，您可以先使用PC版进行查喔~<a class="viewPCVersionBtn" href="http://www.feng.com/Topic/week_review_2015.10.3.shtml">查看PC版</a><b>title</b><h2>h2</h2><p></p><p></p><br /><br /><span style="color:#111111;">　　10月6日消息，微软Windows 10设备发布会于北京时间22：00召开。微软Windows和设备部门执行副总裁Terry Myerson上台演讲，他主要提到“新设备、新芯片、新硬件和新功能”，今天发布会的主题将是微软Win 10设备。</span><br /><br /><p align="center"><img src="http://resource.feng.com/resource/h060/h34/img201510070000470.png" ></img></p><br /><p>pppp<a href="http://resource.feng.com/resource/h060/h34/img201510070000470.png" title="微软发布Surface Pro 4 全新触控笔成亮点" target="_blank"><img src="http://g.hiphotos.baidu.com/zhidao/pic/item/9f510fb30f2442a79fbc68ded343ad4bd113021e.jpg" data-hdsrc="http://resource.feng.com/resource/h060/h61/img201510280942220.jpg" ></img></a> 2014 年度Windows 10是微软跨平台战略的排头兵，而其中Windows 10 Mobile上的Continuum功能更是微软跨平台目标实现的核心功能之一，通过该功能，用户可以将手机上的内容投射到外接显示器上使用，并且还支持如同桌面计算机一样的鼠标键盘操作。<p>苹果</p>设计奖得主、年度屡次获得各类奖项的独立游戏佳作《纪念碑谷（Monument Valley）》今天正在进行冰点，原价 25 元现在只要 6 元就能入手，想支持正版的以及想购买收藏的同学请不要犹豫。注意，这次冰点促销仅在中国区哦。<img src="http://images.weiphone.net/data/attachment/forum/201509/04/233919di788nqiis9yduqz.jpg" />作为 2014 年最有影响力的移动游戏之一（另一款是黑马《80天环游地球》），《纪念碑谷》向所有人证明游戏作品追求艺术高度和商业成功之间存在能够解决的平衡点，到现在，它依旧坚挺地守在各个国家的 AppStore 付费榜和畅销榜上，不仅做到红极一时，也做到了业界长青，玩家对其评价也非常高</p><p>此前在一次媒体<h2 class="feng-news-title">还是那句熟悉的K.O.</h2>提问“《纪念碑谷》对你来说是什么？”中，游戏的艺术设计师 Ken Wong 表示，《纪念碑谷》可以是任何美好的东西，一抹风景、一缕和煦的阳光、或是一块香甜的<h2 class="feng-news-title">还是那句熟悉的K.O.</h2>蛋糕，这已不仅仅是游戏那么简单。</p>看看吧<a href="http://bbsapi.feng.com/home.php?mod=space&uid=10390461" target="_blank">@手机锋友6m279ay</a>',
            appinfo : { // 软件消息 可没有
                icon : 'http://www.weapp.com//picture/app_ios/cn/001/83/79/66/mzl.cover.175x175-75.jpg?f=71fd46b8bb0bf295b114ac86e36c7385',
                name : '纪念碑谷',
                size : '241.34MB',
                appId : '15485451',
                score : 3.5,
                prevPrice : 5,  // 以前的价格， 可没有
                dCount : 3400,  // 下载次数
                tags : ["生活", "好玩"],    // 标记
                description : '家居零食礼物时尚美妆都在这里家居零食礼物时尚美妆都在这里'
            }
        }
    });*/

    // 新闻合集
    /*ds.fill({
        currPage: 1,
        pageSize: 10,
        showIcon: 1,        // 1 yes  0 no
        showPic: 1,         // 1 yes  0 no
        fontSize: 34,
        nightmode : 0,      // 1 yes  0 no
        currFloorId : "6x", // 代表要跳转到楼层ID
        contentType: 2,     // 1 通用新闻   2 新闻合集
        dataList : {
            bannerSrc : 'http://g.hiphotos.baidu.com/zhidao/pic/item/9f510fb30f2442a79fbc68ded343ad4bd113021e.jpg', // 如果没有顶部图片或视频使用空字符串
            pid : '457845457',  // 新闻ID
            category: '资迅',
            title: '6块钱拿下这个精品 《纪念碑谷》今日冰点',
            postDate: '2015-04-25  09:54',
            author: 'Nickcannon',
            articleArr: [
                {
                    title: '《将死之日》 开发商：Orap Games',
                    content: '说起台湾游戏厂商雷亚，许多玩家首先想到的就是他们所推出精美的音乐游戏CytusDeemo除此之外雷亚，近日游戏启动了激活码预约活动。',
                    appinfo : { // 软件消息 可没有
                        icon : 'http://www.weapp.com//picture/app_ios/cn/001/83/79/66/mzl.cover.175x175-75.jpg?f=71fd46b8bb0bf295b114ac86e36c7385',
                        name : '纪念碑谷',
                        size : '241.34MB',
                        appId : '15485451',
                        score : 3.5,
                        prevPrice : 5,  // 以前的价格， 可没有
                        dCount : 3400,  // 下载次数
                        tags : ["生活", "好玩"],    // 标记
                        description : '家居零食礼物时尚美妆都在这里家居零食礼物时尚美妆都在这里'
                    }
                },
                {
                    title: '《将死之日》 开发商：Orap Games',
                    content: '说起台湾游戏厂商雷亚，许多玩家首先想到的就是他们所推出精美的音乐游戏CytusDeemo除此之外雷亚，近日游戏启动了激活码预约活动。',
                    appinfo : { // 软件消息 可没有
                        icon : 'http://www.weapp.com//picture/app_ios/cn/001/83/79/66/mzl.cover.175x175-75.jpg?f=71fd46b8bb0bf295b114ac86e36c7385',
                        name : '纪念碑谷',
                        size : '241.34MB',
                        appId : '15485451',
                        score : 3.5,
                        prevPrice : 5,  // 以前的价格， 可没有
                        dCount : 3400,  // 下载次数
                        tags : ["生活", "好玩"],    // 标记
                        description : '家居零食礼物时尚美妆都在这里家居零食礼物时尚美妆都在这里'
                    }
                },
                {
                    title: '《将死之日》 开发商：Orap Games',
                    content: '说起台湾游戏厂商雷亚，许多玩家首先想到的就是他们所推出精美的音乐游戏CytusDeemo除此之外雷亚，近日游戏启动了激活码预约活动。',
                    appinfo : { // 软件消息 可没有
                        icon : 'http://www.weapp.com//picture/app_ios/cn/001/83/79/66/mzl.cover.175x175-75.jpg?f=71fd46b8bb0bf295b114ac86e36c7385',
                        name : '纪念碑谷',
                        size : '241.34MB',
                        appId : '15485451',
                        score : 3.5,
                        prevPrice : 5,  // 以前的价格， 可没有
                        dCount : 3400,  // 下载次数
                        tags : ["生活", "好玩"],    // 标记
                        description : '家居零食礼物时尚美妆都在这里家居零食礼物时尚美妆都在这里'
                    }
                }
            ]
        }
    });*/

    /*ds.fillComments({
        currPage: 1,        // 当为2时代表内容第二页
        pageSize: 10,
        showIcon: 1,        // 1 yes  0 no
        showPic: 1,         // 1 yes  0 no
        fontSize: 34,
        nightmode : 0,      // 1 yes  0 no
        currFloorId : "112x",
        commentType: 1,     // 1 为热门评论 2 为最新评论
        comments: [
        {
            "cid" : "111",  // 评论ID
            "uid" : "122",  // 该评论用户ID
            "username" : "游戏大boss",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg", // 头像
            "floor" : "2",
            "havePraise": 1,    // 是否已赞过该评论
            "praiseCount" : 120,  // 该评论赞的数量
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : '很好，很益智，越玩越想玩。就是关数太少了，可惜希望再添加大写。<a href="http://bbsapi.feng.com/home.php?mod=space&uid=10390461" target="_blank">@手机锋友6m279ay</a>',
            "replayArr": []     // 该评论的回复
        },
        {
            "cid" : "112",
            "uid" : "322",
            "username" : "Jack",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
            "floor" : "3",
            "havePraise": 0,
            "praiseCount" : 36,
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : "很好，很益智，越玩越想玩。就是关数太少了，可惜希望再添加大写。",
            "replayArr": [
                {
                    "cid" : "r111",
                    "uid" : "r321",
                    "username" : "RJack",
                    "ruid" : "322",       // 回复对象的用户id
                    "rusername" : "Jack2",   // 回复对象的昵称
                    "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
                    "floor" : "1",
                    "havePraise": 1,
                    "praiseCount" : 114,
                    "haveTread" : 1,    // 是否已踩过该评论
                    "treadCount" : 234, // 踩的数量
                    "postDate" : "2014/05/28 21:20",
                    "content" : "喜欢苹果的用户估计是不会太介意的。"
                },
                {
                    "cid" : "r112",
                    "uid" : "r322",
                    "username" : "Anna",
                    "ruid" : "r321",       // 回复对象的用户id
                    "rusername" : "RJack",   // 回复对象的昵称
                    "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
                    "floor" : "2",
                    "havePraise": 1,
                    "praiseCount" : 36,
                    "haveTread" : 0,    // 是否已踩过该评论
                    "treadCount" : 234, // 踩的数量
                    "postDate" : "2014/05/28 21:20",
                    "content" : "ios真是全能啊，原来是这么个战略。"
                }
            ]
        },
        {
            "cid" : "113",
            "uid" : "322",
            "username" : "Jack",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
            "floor" : "4",
            "havePraise": 0,
            "praiseCount" : 36,
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : "巴西通过各种生物理念上市脱口秀恶搞图形处理测试结果出巴西通过各种生物理念上市脱口秀恶搞图",
            "replayArr": []
        }]
    });

    ds.fillComments({
        currPage: 1,        // 当为2时代表内容第二页
        pageSize: 10,
        showIcon: 1,        // 1 yes  0 no
        showPic: 1,         // 1 yes  0 no
        fontSize: 34,
        nightmode : 0,      // 1 yes  0 no
        currFloorId : "112x",
        commentType: 2,     // 1 为热门评论 2 为最新评论
        comments: [
        {
            "cid" : "111",  // 评论ID
            "uid" : "122",  // 该评论用户ID
            "username" : "游戏大boss",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg", // 头像
            "floor" : "2",
            "havePraise": 1,    // 是否已赞过该评论
            "praiseCount" : 120,  // 该评论赞的数量
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : '很好，很益智，越玩越想玩。就是关数太少了，可惜希望再添加大写。<a href="http://bbsapi.feng.com/home.php?mod=space&uid=10390461" target="_blank">@手机锋友6m279ay</a>',
            "replayArr": []     // 该评论的回复
        },
        {
            "cid" : "112",
            "uid" : "322",
            "username" : "Jack",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
            "floor" : "3",
            "havePraise": 0,
            "praiseCount" : 36,
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : "很好，很益智，越玩越想玩。就是关数太少了，可惜希望再添加大写。",
            "replayArr": [
                {
                    "cid" : "r111",
                    "uid" : "r321",
                    "username" : "RJack",
                    "ruid" : "322",       // 回复对象的用户id
                    "rusername" : "Jack2",   // 回复对象的昵称
                    "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
                    "floor" : "1",
                    "havePraise": 1,
                    "praiseCount" : 114,
                    "haveTread" : 1,    // 是否已踩过该评论
                    "treadCount" : 234, // 踩的数量
                    "postDate" : "2014/05/28 21:20",
                    "content" : "喜欢苹果的用户估计是不会太介意的。"
                },
                {
                    "cid" : "r112",
                    "uid" : "r322",
                    "username" : "Anna",
                    "ruid" : "r321",       // 回复对象的用户id
                    "rusername" : "RJack",   // 回复对象的昵称
                    "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
                    "floor" : "2",
                    "havePraise": 1,
                    "praiseCount" : 36,
                    "haveTread" : 0,    // 是否已踩过该评论
                    "treadCount" : 234, // 踩的数量
                    "postDate" : "2014/05/28 21:20",
                    "content" : "ios真是全能啊，原来是这么个战略。"
                }
            ]
        },
        {
            "cid" : "113",
            "uid" : "322",
            "username" : "Jack",
            "icon" : "http://face.weiphone.net/data/avatar/009/26/94/30_avatar_middle.jpg",
            "floor" : "4",
            "havePraise": 0,
            "praiseCount" : 36,
            "haveTread" : 0,    // 是否已踩过该评论
            "treadCount" : 234, // 踩的数量
            "postDate" : "2014/05/28 21:20",
            "content" : "巴西通过各种生物理念上市脱口秀恶搞图形处理测试结果出巴西通过各种生物理念上市脱口秀恶搞图",
            "replayArr": []
        }]
    });*/

});