Date.prototype.format = function(format){ 
var o = { 
"M+" : this.getMonth()+1, //month 
"d+" : this.getDate(), //day 
"h+" : this.getHours(), //hour 
"m+" : this.getMinutes(), //minute 
"s+" : this.getSeconds(), //second 
"q+" : Math.floor((this.getMonth()+3)/3), //quarter 
"S" : this.getMilliseconds() //millisecond 
} 

if(/(y+)/.test(format)) { 
format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
} 

for(var k in o) { 
if(new RegExp("("+ k +")").test(format)) { 
format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length)); 
} 
} 
return format; 
} 

function changeTime(time){
	var timeNow = Date.parse(new Date());	//当前时间
	timeNow = timeNow/1000;

	var difftime = timeNow - time;	//时间差
	if(difftime<=0){
		return "刚刚";
	}
	var diffMin = parseInt(difftime / 60);  // 分钟
	var diffHoure = parseInt(difftime / 3600);  // 小时
	var diffDay = parseInt(diffHoure / 24);  // 天
	if(difftime < 60){	//1分钟内，用几秒前展示
		return difftime+"秒钟前";
	}else if(diffMin>=1 && diffMin < 60){	//1小时内，用几分钟前展示
		return diffMin+"分钟前";
	}else if(diffHoure>=1 && diffHoure < 24){	//24小时内，用几小时前展示
		return diffHoure+"小时前";
	}
	else if(24 <= diffHoure && diffHoure < 48){
		return "昨天";
	}
	else if(diffDay>1 && diffDay < 7){
		return diffDay+"天前";
	}else{
		var now = new Date(time); 
		var dtime = now.format("yyyy-MM-dd hh:mm:ss"); 
		return dtime;
	}
}

function autoAddEllipsis(pStr, pLen) {  
  
    var _ret = cutString(pStr, pLen);  
    var _cutFlag = _ret.cutflag;  
    var _cutStringn = _ret.cutstring;  
  
    if ("1" == _cutFlag) {  
        return _cutStringn + "...";  
    } else {  
        return _cutStringn;  
    }  
}  
 
function cutString(pStr, pLen) {  
  
    // 原字符串长度  
    var _strLen = pStr.length;  
  
    var _tmpCode;  
  
    var _cutString;  
  
    // 默认情况下，返回的字符串是原字符串的一部分  
    var _cutFlag = "1";  
  
    var _lenCount = 0;  
  
    var _ret = false;  
  
    if (_strLen <= pLen/2) {  
        _cutString = pStr;  
        _ret = true;  
    }  
  
    if (!_ret) {  
        for (var i = 0; i < _strLen ; i++ ) {  
            if (isFull(pStr.charAt(i))) {  
                _lenCount += 2;  
            } else {  
                _lenCount += 1;  
            }  
  
            if (_lenCount > pLen) {  
                _cutString = pStr.substring(0, i);  
                _ret = true;  
                break;  
            } else if (_lenCount == pLen) {  
                _cutString = pStr.substring(0, i + 1);  
                _ret = true;  
                break;  
            }  
        }  
    }  
      
    if (!_ret) {  
        _cutString = pStr;  
        _ret = true;  
    }  
  
    if (_cutString.length == _strLen) {  
        _cutFlag = "0";  
    }  
  
    return {"cutstring":_cutString, "cutflag":_cutFlag};  
}  

  
function isFull (pChar) { 
  for (var i = 0; i < pChar.strLen ; i++ ) {     
    if ((pChar.charCodeAt(i) > 128)) {  
        return true;  
    } else {  
        return false;  
    } 
}
}