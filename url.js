/**
 @description LimechatでのURL解析用スクリプト.
 @author sura.
 @version v1_6_2.
 @since 2011/08/21.
 */

/**
 @description Limechatが用意した関数.
 @param {Object} _prefix ユーザについての情報が入っている.
 @param {String} _channel チャンネル名が入れられている.
 @param {String} _text 発言が入れられている.
 */
function event::onChannelText(_prefix, _channel, _text) {
	TITLE.onChannelText(_prefix, _channel, _text);
}

function event::onUnload() {
	TITLE = null;
}

var TITLE = (function() {

var COLOR_ = '',
	FLG_SPECIAL_URL = 1;

var title = {
	onLoad: function() {
	},
	onUnload: function() {
	},
	onChannelText: function(_prefix, _channel, _text) {
		if(/^([sn]m\d{3,8})/i.exec(_text)) {
			var nicoURL = 'http://www.nicovideo.jp/watch/' + RegExp.$1;
			send(_channel, '<color red><bold>[URL] <stop><bold>' + nicoURL);
			getHTTP(_channel, convertURL(nicoURL), 'HEAD');
		} else if (/(h?ttps?:\/\/[\w-~+*_@.,';:!?$&=%#()\/]+)/i.exec(_text)) {
			getHTTP(_channel, convertURL(RegExp.$1), 'HEAD');
		}
	}
};

/**
 @description 特定のURLを別のURLに置き換えます.
 @param {String} _url 変換するURL.
 @return {String} 変換されたか・されてないURL.
 */
function convertURL(_url) {
	if (/^(ttps?:\/\/[\w-~+*_@.,';:!?$&=%#()\/]+)/i.exec(_url))
		_url = 'h' + _url;

	/*アンカーはエラー？を発生させるため回避*/
	_url = _url.replace(/#\w*$/i, '');

	if (/^http:\/\/(?:www.nicovideo.jp\/watch|nico\.ms)\/((?:[sn]m)?\d+)/i.exec(_url))
		return 'http://ext.nicovideo.jp/api/getthumbinfo/' + RegExp.$1;
	else if (/^http:\/\/www.youtube.com\/watch?.*?v=([\-\w]+)/i.exec(_url))
		return 'http://gdata.youtube.com/feeds/api/videos/' + RegExp.$1;
	return _url;
}

/**
 @description あらかじめヘッダーでGETしていいものか確認.
 @description URL先をゲットして、タイトルを解析し、それを指定のチャンネルに送信します.
 @param {String} _channel 送信するチャンネル名.
 @param {String} _url GETするURL.
 */
function getHTTP(_channel, _url, _method) {
	var axo = XMLHttpRequest();
	// axo.setTimeouts(5*1000,5*1000,15*1000,15*1000);
	axo.onreadystatechange = function() {
		if (axo.readyState == 4) {
			try {
				if (_method == 'GET') {
					// タイトル表示
					send(_channel, '<color>07[URL] <stop>' + checkUrl(_url, encodeCharset(axo)));
				} else if (_method == 'HEAD') {
					if (/(text\/\w+|application\/(atom(cat|svc)?\+)?xml).+/.exec(axo.getResponseHeader('Content-Type'))) {
						getHTTP(_channel, _url, 'GET');
					} else if (axo.getResponseHeader('Content-Length')) {
						// ファイルサイズ表示
						send(_channel, '<color>07[script] <stop><' + getStringFilesize(axo.getResponseHeader('Content-Length')) + '>');
					}
				}
			} catch (e) {} finally {
				axo.onreadystatechange = new Function();/*メモリリーク回避*/
			}
		}
	}
	try {
		axo.open(_method, _url, true);
		if (_method == 'GET') {
			axo.setRequestHeader('Range','bytes=0-32768');/*Range Headerで分割ダウンロード*/
			axo.setRequestHeader('User-Agent','Mozilla/5.0 (compatible; url_v1.6.3@limechat;)');
		}
		axo.send('');
	} catch (e) {
		axo.onreadystatechange = new Function();/*メモリリーク回避*/
		send(_channel, 'Error001:'+e.message);
	}
}

//スクリプト読み込み時に、使用可能なIDを特定
var id_prog = (function() {
	var progIDs = [
		'Msxml2.ServerXMLHTTP.6.0',
		'Msxml2.ServerXMLHTTP.5.0',
		'Msxml2.ServerXMLHTTP.4.0',
		'Msxml2.ServerXMLHTTP.3.0',
		'Msxml2.ServerXMLHTTP',
		'Microsoft.ServerXMLHTTP',
		'Msxml2.XMLHTTP.6.0',
		'Msxml2.XMLHTTP.5.0',
		'Msxml2.XMLHTTP.4.0',
		'Msxml2.XMLHTTP.3.0',
		'Msxml2.XMLHTTP',
		'Microsoft.XMLHTTP'
	];
	for (var i = progIDs.length; i--;) {
		try {
			new ActiveXObject(progIDs[i]);
			return progIDs[i];
		} catch (e) {
			if (i == progIDs.length - 1)
				log('XMLHTTPが使用できません。');
		}
	}
})();

/**
 @description あらかじめヘッダーでGETしていいものか確認.
 @return ActiveXObject(XMLHTTP) Objectを返します。.
 */
function XMLHttpRequest() {
	return new ActiveXObject(id_prog);
}

/**
 @description 数値をbyte単位にして返します.
 @param {Number} _byte 変換したい数値.
 @return {Number} 変換された数値.
 */
function getStringFilesize(_byte) {
	if (_byte > 1023) {
		if (_byte > 1048575) {
				if (_byte > 1073741823) {
					return (_byte/1073741824|0) + 'GB';
				}
			return (_byte/1048576|0) + 'MB';
		}
		return (_byte/1024|0) + 'KB';
	}
	return (_byte|0) + 'Byte';
}

/**
 @description ADODB.Streamでバイナリデータを記述されている文字コードに変換して返します.
 @param {Object} _axo ActiveXObject('Msxml')でGETしたObject.
 @return {String} 変換された文字列.
 */
function encodeCharset(_axo) {
	var stream = new ActiveXObject('ADODB.Stream');
	var charset = '_autodetect';
	try {
		var text = _axo.responseText.slice(0, 1024*1024/2);
		if (_axo.getResponseHeader('Content-Type').match(/charset=["']?([\w-]+)/i)) {
			charset = RegExp.$1;
		} else if (text.match(/<head(?:.|\n)*?>(?:.|\n)*?charset=["']?([\w-_]+)(?:.|\n)*?<\/head>/i)) {
			charset = RegExp.$1;
		}
	} catch (e) {
		charset = 'Shift_JIS';
	} finally {
		if (charset === 'utf-8') { return text; }
		stream.Charset = charset;
	}
	try {
		stream.Open();
		stream.Type = 1;
		stream.Write(_axo.responseBody);
		stream.Position = 0;
		stream.Type = 2;
		text = stream.ReadText();
	} catch (e) {} finally {
		stream.Close();
	}
	return text;
}

/**
 @description URLを種類ごとに振り分けて解析しその返却されてきた結果を返します.
 @param {String} _url GETしてきたURL.
 @param {String} _text GETしてきた内容.
 @return {String} 解析結果.
 */
function checkUrl(_url, _text) {
	for (var i in hosts)
		if (new RegExp('https?:\/\/' + i).test(_url))
			return (cleanText(unescapeHtmlCharacter(hosts[i](_text))));
	return '';
}

var hosts = {
	/*専用解析*/
	'ext.nicovideo.jp/api/getthumbinfo/': function (_text) {try {
		return (hosts['*'](_text) + '(' + /<length>(.*?)<\/length>/i.exec(_text)[1] + ')' + ' <color>12[説明]<stop>' + removeHtmlTag(/<description>(.*?)<\/description>/i.exec(_text)[1]));
	} catch (e) {try {
		return (/<code>(.*?)<\/code>/.exec(_text)[1]);
	} catch (e) { return hosts['*'](_text)}}},
	'gdata.youtube.com/feeds/api/videos/': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[説明]<stop>' + /<content type='text'>(.*?)<\/content>/i.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'www.pixiv.net/.*illust_id=': function (_text) {try {
		return (/<title>「(.*?)」\//.exec(_text)[1] + ' <color>12[user]<stop>' + /\/「(.*?)」の.*?<\/title>/.exec(_text)[1] + ' <color>12[説明]<stop>' + /<meta property="og:description" content="(.*?)">/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'www1.axfc.net': function (_text) {try {
		var temp = '' + hosts['*'](_text);
		if (/<div class="comme"><h3>投稿者ファイル説明<\/h3><p>(.*?)<br><\/p>/.exec(_text))
			temp += ' <color>12[説明]<stop>' + RegExp.$1;
		if (/<h3>オリジナルファイルネーム<\/h3><p>(.*?)<\/p><\/div>/.exec(_text))
			temp += ' <color>12[file]<stop>' + RegExp.$1;
		return temp;
	} catch (e) {return hosts['*'](_text)}},
	'u6.getuploader.com': function (_text) {try {
		return (hosts['*'](_text) + ' | ' + /<meta name="Description" content="(.*?)"/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'twitvideo.jp': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[コメント]<stop>' + /<span class="sf_comment">(.*?)<\/span>/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'twitpic.com': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[名前]<stop>' + /<p><span id="photo-info-name">(.*?)<\/span>/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
/**
 @description タイトルのタグを調べて返します.
 @param {String} _text GETしてきた内容.
 @return {String} 解析結果.
 */
	'*': function (_text) {try {
		if (/<title.*?>((?:.|\n|\r)*?)<\/title>/i.exec(_text))
			return RegExp.$1;
		else
			return 'No Title';
	} catch (e) {return 'Error002:'+e.message;}}
};

/**
 @description 余分なスペース・改行を削除したり、一定の長さに整える.
 @param {String} _text 整理する文字列.
 @return {String} 整理された文字列.
 */
function cleanText(_text) {
	var regexp = /(^[\s|　]+|[\s|　]+$|\n|\r)|([\s|　]+)/g;
	var callback = function(all, zero, one) {
		if (zero)
			return '';
		else if (one)
			return ' ';
	};
	try {
		_text = _text.replace(regexp, callback);
		if (_text.length > 150) {
			_text = _text.slice(0, 150) + '...'
		}
	} catch (e) {log('Error003'+e.message + ' : ' + _text)}
	return _text;
}

/**
 @description HTML文字コード表現から文字列へ.
 @param {String} _text 変換する文字列.
 @return {String} 変換された文字列.
 */
function unescapeHtmlCharacter(_text) {
	var ReplaceReg = new RegExp(/&#(\d+);?|&#x([0-9a-fA-F]+);?|&(amp|gt|lt|nbsp|quot)(;)?/g);
	var Entities = {'nbsp': 160, 'quot': 34, 'gt': 62, 'lt': 60, 'amp': 38};
	try {
		var temp;
		while(_text != (temp = _text.replace(ReplaceReg, function(str, num, hex, ent,l) {
			if (num)
				return String.fromCharCode(num);
			else if (hex)
				return String.fromCharCode(parseInt('0x' + hex));
			else if (Entities[ent])
				return String.fromCharCode(Entities[ent]);
			else
				return '&' + ent + l;
		}))){_text = temp;};
	} catch (e) {log('Error004:'+e.message + ' : ' + _text)}
	return _text;
}

/**
 @description 文字列からHTMLタグを除去.
 @param {String} _text 変換する文字列.
 @return {String} 変換された文字列.
 */
function removeHtmlTag(_text) {
	return unescapeHtmlCharacter(_text).replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
}


return title;
})();

