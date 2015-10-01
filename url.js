﻿//2011/12/06
// byte計算方法とか微調整
//2011/12/05
// eval関数いい加減使うのあれなんで廃止
// unescapeHtmlCharacterの量が多すぎたので最小限に
// HEADでいったん安全性？確認する
// byteを表示するようにしてみた
// utf-8別に変換し直さなくていいんじゃね？
/**
	@description LimechatでのURL解析用スクリプト.
	@author sura.
	@version ｖ1.2.
	@since 2011/08/21.
 */

/**
	@description Limechatが用意した関数.
	@param {Object} _prefix ユーザについての情報が入っている.
	@param {String} _channel チャンネル名が入れられている.
	@param {String} _text 発言が入れられている.
 */
function event::onChannelText(_prefix, _channel, _text) {
	if (/(https?:\/\/[\w-~+*_@.,';:!?$&=%#()\/]+)/i.exec(_text))
		getHeader(_channel, convertUrl(RegExp.$1));
}

/**
	@description 特定のURLを別のURLに置き換えます.
	@param {String} _url 変換するURL.
	@return {String} 変換されたか・されてないURL.
 */
function convertUrl(_url) {
	if (/^http:\/\/(?:www.nicovideo.jp\/watch|nico\.ms)\/((?:[sn]m)?\d+)/.exec(_url))
		return 'http://ext.nicovideo.jp/api/getthumbinfo/' + RegExp.$1;
	else if (/^http:\/\/www.youtube.com\/watch?.*?v=([\-\w]+)/.exec(_url))
		return 'http://gdata.youtube.com/feeds/api/videos/' + RegExp.$1;
	return _url.replace(/#\w+$/, '');/*アンカー回避*/
}

/**
	@description あらかじめヘッダーでGETしていいものか確認.
	@param {String} _channel 送信するチャンネル名.
	@param {String} _url GETするURL.
 */
function getHeader(_channel, _url) {
	var axo = new ActiveXObject('Msxml2.ServerXMLHTTP.6.0');
	axo.onreadystatechange = function() {
		if (axo.readyState == 4) {
			try {
				if (/(text\/\w+|application\/atom(cat|svc)?\+xml)/.exec(axo.getResponseHeader('Content-Type'))) {
					getHTTP(_channel, _url);
				} else if (axo.getResponseHeader('Content-Length')) {
					send(_channel, '<color>07[script]<color>Filesize:' + getStringFilesize(axo.getResponseHeader('Content-Length')));
				}
			} catch (e) {} finally {
				axo.onreadystatechange = new Function();/*メモリリーク回避*/
			}
		}
	}
	axo.open('HEAD', _url, true);
	axo.send('');
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
	@description URL先をゲットして、タイトルを解析し、それを指定のチャンネルに送信します.
	@param {String} _channel 送信するチャンネル名.
	@param {String} _url GETするURL.
 */
function getHTTP(_channel, _url) {
	var axo = new ActiveXObject('Msxml2.ServerXMLHTTP.6.0');
	axo.onreadystatechange = function() {
		if (axo.readyState == 4) {
			try {
				send(_channel, '<color>07[script]<color> ' + checkUrl(_url, encodeCharset(axo)));
			} catch (e) {} finally {
				axo.onreadystatechange = new Function();/*メモリリーク回避*/
			}
		}
	}
	axo.open('GET', _url, true);
	axo.send('');
}

/**
	@description ADODB.Streamでバイナリデータを記述されている文字コードに変換して返します.
	@param {Object} _axo ActiveXObject('Msxml')でGETしたObject.
	@return {String} 変換された文字列.
 */
function encodeCharset(_axo) {
	var stream = new ActiveXObject('ADODB.Stream');
	try {
		var charset = '_autodetect';
		if (_axo.getResponseHeader('Content-Type').match(/charset=["']?([\w-]+)/i)) {
			charset = RegExp.$1;
		} else if (_axo.responseText.match(/<head>(?:.|\n)*?charset=["']?([\w-_]+)(?:.|\n)*?<\/head>/i)) {
			charset = RegExp.$1;
		}
	} catch (e) {
		charset = 'Shift_JIS';
	} finally {
		if (charset == 'utf-8') { return val; }
		stream.Charset = charset;
	}
	stream.Open();
	stream.Type = 1;
	stream.Write(_axo.responseBody);
	stream.Position = 0;
	stream.Type = 2;
	try {
		var text = '';
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
		return (hosts['*'](_text) + '(' + /<length>(.*?)<\/length>/i.exec(_text)[1] + ')' + ' <color>12[説明]<color> ' + /<description>(.*?)<\/description>/i.exec(_text)[1]);
	} catch (e) {try {
		return (/<code>(.*?)<\/code>/.exec(_text)[1]);
	} catch (e) { return hosts['*'](_text)}}},
	'gdata.youtube.com/feeds/api/videos/': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[説明]<color> ' + /<content type='text'>(.*?)<\/content>/i.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'www.pixiv.net/.*illust_id=': function (_text) {try {
		return (/<title>「(.*?)」\//.exec(_text)[1] + ' <color>12[user]<color> ' + /\/「(.*?)」の.*?<\/title>/.exec(_text)[1] + ' <color>12[説明]<color> ' + /<meta property="og:description" content="(.*?)">/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'www1.axfc.net': function (_text) {try {
		var temp = '' + hosts['*'](_text);
		if (/<div class="comme"><h3>投稿者ファイル説明<\/h3><p>(.*?)<br><\/p>/.exec(_text))
			temp += ' <color>12[説明]<color> ' + RegExp.$1;
		if (/<h3>オリジナルファイルネーム<\/h3><p>(.*?)<\/p><\/div>/.exec(_text))
			temp += ' <color>12[file]<color> ' + RegExp.$1;
		return temp;
	} catch (e) {return hosts['*'](_text)}},
	'u6.getuploader.com': function (_text) {try {
		return (hosts['*'](_text) + ' | ' + /<meta name="Description" content="(.*?)"/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'twitvideo.jp': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[コメント]<color> ' + /<span class="sf_comment">(.*?)<\/span>/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
	'twitpic.com': function (_text) {try {
		return (hosts['*'](_text) + ' <color>12[名前]<color> ' + /<p><span id="photo-info-name">(.*?)<\/span>/.exec(_text)[1]);
	} catch (e) {return hosts['*'](_text)}},
/**
	@description タイトルのタグを調べて返します.
	@param {String} _text GETしてきた内容.
	@return {String} 解析結果.
 */
	'*': function (_text) {try {
		return (/<title.*?>((?:.|\n|\r)*?)<\/title>/i.exec(_text)[1]);
	} catch (e) {return;}}
};

/**
	@description 余分なスペース・改行を削除したり、一定の長さに整える.
	@param {String} _text 整理する文字列.
	@return {String} 整理された文字列.
 */
function cleanText(_text) {
	_text = _text.replace(/(^[\s|　]+|[\s|　]+$|\n|\r)|([\s|　]+)/g, function(all, zero, one) {
		if (zero)
			return '';
		else if (one)
			return ' ';
	})
	if (_text.length > 150)
		_text = _text.slice(0, 150) + '...'
	return _text;
}

/**
	@description HTML文字コード表現から文字列へ
	@param {String} _text 変換する文字列.
	@return {String} 変換された文字列.
 */
// 対象コード<-大文字小文字をどうする？
var ReplaceReg = new RegExp(/&#(\d+);?|&#x([0-9a-fA-F]+);?|&(amp|gt|lt|nbsp|quot)(;)?/g);
// 置換テーブル
var Entities = {'nbsp': 160, 'quot': 34, 'gt': 62, 'lt': 60, 'amp': 38};
function unescapeHtmlCharacter(_text) {
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

	return _text;
}