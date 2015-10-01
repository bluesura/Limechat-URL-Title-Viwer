/**
	@description LimechatでのURL解析用スクリプト.
	@author sura.
	@version ｖ1.0.
	@since 2011/08/21.
 */

/**
	@description Limechatが用意した関数.
	@param {Object} _prefix ユーザについての情報が入っている.
	@param {String} _channel チャンネル名が入れられている.
	@param {String} _text 発言が入れられている.
 */
function event::onChannelText(_prefix, _channel, _text) {
	if (!/\[(マクロ|スクリプト|macro|script)\]/i.test(_text))
		if (/(https?:\/\/[\w-~+*_@.,';:!?$&=%#()\/]+)/i.exec(_text))
			getHTTP(_channel, convertUrl(RegExp.$1));
}

/**
	@description 特定のURLを別のURLに置き換えます.
	@param {String} _url 変換するURL.
	@return {String} 変換されたか・されてないURL.
 */
function convertUrl(_url) {
	_url = _url.replace(/#\w+$/, '');/*アンカー回避*/
	if (/^http:\/\/(?:www.nicovideo.jp\/watch|nico\.ms)\/((?:[sn]m)?\d+)/.exec(_url))
		return 'http://ext.nicovideo.jp/api/getthumbinfo/' + RegExp.$1;
	else if (/^http:\/\/www.youtube.com\/watch?.*?v=([\-\w]+)/.exec(_url))
		return 'http://gdata.youtube.com/feeds/api/videos/' + RegExp.$1;
	else if (/\.(html|htm|shtml|mht|xml|xhtml|xht|php|cgi|asp)$/.exec(_url) || !/\.\w+?$/g.exec(_url))
		return _url;
	return '';
}

/**
	@description URL先をゲットして、タイトルを解析し、それを指定のチャンネルに送信します.
	@param {String} _channel 送信するチャンネル名.
	@param {String} _url GETするURL.
 */
function getHTTP(_channel, _url) {
	var axo = new ActiveXObject('Microsoft.XMLHTTP');
	axo.onreadystatechange = function() {
		if (axo.readyState == 4) {
			try {
				send(_channel, '<color>07[script]<color> ' + checkUrl(_url, encodeCharset(axo)));
			} catch (e) {} finally {
				axo.onreadystatechange = new Function();/*メモリリーク回避*/
			}
		}
	}
	if(_url) {
		axo.open('GET', _url, true);
		axo.send(null);
	}
}

/**
	@description ADODB.Streamでバイナリデータを記述されている文字コードに変換して返します.
	@param {Object} _axo ActiveXObject('Msxml')でGETしたObject.
	@return {String} 変換された文字列.
 */
function encodeCharset(_axo) {
	var stream = new ActiveXObject('ADODB.Stream');
	stream.Open();
	stream.Type = 1;
	stream.Write(_axo.responseBody);
	stream.Position = 0;
	stream.Type = 2;
	try {
		var val = _axo.responseText;
		var charset = '';
		var contentType = _axo.getResponseHeader('Content-Type');
		if (contentType.match(/charset=["']?([\w-]+)/i)) {
			charset = RegExp.$1;
		} else if (val.match(/<head>(?:.|\n)*?charset=["']?([\w-]+)(?:.|\n)*?<\/head>/i)) {
			charset = RegExp.$1;
		} else {
			charset = '_autodetect';
		}
	} catch (e) {
		charset = 'Shift_JIS';
	} finally {
		stream.Charset = charset;
	}
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
	var hosts = {
		'ext.nicovideo.jp/api/getthumbinfo/': 'parseNicoMovie',
		'gdata.youtube.com/feeds/api/videos/': 'parseYoutube',
		'www.pixiv.net/.*illust_id=': 'parsePixiv',
		'www1.axfc.net': 'parseAxfc',
		'u6.getuploader.com': 'parseGetupoader',
		'twitvideo.jp': 'parseTwitvideo',
		'twitpic.com': 'parseTwitpic',
		'*': 'parseTitle'
	};
	for (var i in hosts)
		if (new RegExp('https?:\/\/' + i).test(_url))
			return (cleanText(unescapeHtmlCharacter(eval(hosts[i] + '(_text)'))));
	return '';
}

/**
	@description 余分なスペースを削除したり、一定の長さに整える.
	@param {String} _text 整理する文字列.
	@return {String} 整理された文字列.
 */
function cleanText(_text) {
	_text = _text.replace(/(^[\s|　]+|[\s|　]+$)|([\s|　]+)/g, function(all, zero, one) {
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
	@description タイトルのタグを調べて返します.
	@param {String} _text GETしてきた内容.
	@return {String} 解析結果.
 */
function parseTitle(_text) {try {
	return (/<title.*?>((?:.|\n|\r)*?)<\/title>/i.exec(_text)[1]);
} catch (e) {return;}}

/*ここから専用ページの解析関数*/
function parsePixiv(_text) {try {
	return (/<title>「(.*?)」\//.exec(_text)[1] + ' <color>12[user]<color> ' + /\/「(.*?)」の.*?<\/title>/.exec(_text)[1] + ' <color>12[説明]<color> ' + /<meta property="og:description" content="(.*?)">/.exec(_text)[1]);
} catch (e) {return parseTitle(_text)}}

function parseAxfc(_text) {try {
	var temp = '' + parseTitle(_text);
	if (/<div class="comme"><h3>投稿者ファイル説明<\/h3><p>(.*?)<br><\/p>/.exec(_text))
		temp += ' <color>12[説明]<color> ' + RegExp.$1;
	if (/<h3>オリジナルファイルネーム<\/h3><p>(.*?)<\/p><\/div>/.exec(_text))
		temp += ' <color>12[file]<color> ' + RegExp.$1;
	return temp;
} catch (e) {return parseTitle(_text)}}

function parseGetupoader(_text) {try {
	return (parseTitle(_text) + ' | ' + /<meta name="Description" content="(.*?)"/.exec(_text)[1]);
} catch (e) {return parseTitle(_text)}}

function parseTwitpic(_text) {try {
	return (parseTitle(_text) + ' <color>12[名前]<color> ' + /<p><span id="photo-info-name">(.*?)<\/span>/.exec(_text)[1]);
} catch (e) {return parseTitle(_text)}}

function parseTwitvideo(_text) {try {
	return (parseTitle(_text) + ' <color>12[コメント]<color> ' + /<span class="sf_comment">(.*?)<\/span>/.exec(_text)[1]);
} catch (e) {return parseTitle(_text)}}

function parseNicoMovie(_text) {try {
	return (parseTitle(_text) + '(' + /<length>(.*?)<\/length>/i.exec(_text)[1] + ')' + ' <color>12[説明]<color> ' + /<description>(.*?)<\/description>/i.exec(_text)[1]);
} catch (e) {try {
	return (/<code>(.*?)<\/code>/.exec(_text)[1]);
} catch (e) { return parseTitle(_text)}}}

function parseYoutube(_text) {try {
	return (parseTitle(_text) + ' <color>12[説明]<color> ' + /<content type='text'>(.*?)<\/content>/i.exec(_text)[1]);
} catch (e) {return parseTitle(_text)}}

/**
	@description HTML文字コード表現から文字列へ
	@param {String} _text 変換する文字列.
	@return {String} 変換された文字列.
 */
// 対象コード<-大文字小文字をどうする？
var ReplaceReg = new RegExp(/&#(\d+);?|&#x([0-9a-fA-F]+);?|&(AElig|Aacute|Acirc|Agrave|Alpha|Aring|Atilde|Auml|Beta|Ccedil|Chi|Dagger|Delta|ETH|Eacute|Ecirc|Egrave|Epsilon|Eta|Euml|Gamma|Iacute|Icirc|Igrave|Iota|Iuml|Kappa|Lambda|Mu|Ntilde|Nu|OElig|Oacute|Ocirc|Ograve|Omega|Omicron|Oslash|Otilde|Ouml|Phi|Pi|Prime|Psi|Rho|Scaron|Sigma|THORN|Tau|Theta|Uacute|Ucirc|Ugrave|Upsilon|Uuml|Xi|Yacute|Yuml|Zeta|aacute|acirc|acute|aelig|agrave|alefsym|alpha|amp|and|ang|aring|asymp|atilde|auml|bdquo|beta|brvbar|bull|cap|ccedil|cedil|cent|chi|circ|clubs|cong|copy|crarr|cup|curren|dArr|dagger|darr|deg|delta|diams|divide|eacute|ecirc|egrave|empty|emsp|ensp|epsilon|equiv|eta|eth|euml|euro|exist|fnof|forall|frac12|frac14|frac34|frasl|gamma|ge|gt|hArr|harr|hearts|hellip|iacute|icirc|iexcl|igrave|image|infin|int|iota|iquest|isin|iuml|kappa|lArr|lambda|lang|laquo|larr|lceil|ldquo|le|lfloor|lowast|loz|lrm|lsaquo|lsquo|lt|macr|mdash|micro|middot|minus|mu|nabla|nbsp|ndash|ne|ni|not|notin|nsub|ntilde|nu|oacute|ocirc|oelig|ograve|oline|omega|omicron|oplus|or|ordf|ordm|oslash|otilde|otimes|ouml|para|part|permil|perp|phi|pi|piv|plusmn|pound|prime|prod|prop|psi|quot|rArr|radic|rang|raquo|rarr|rceil|rdquo|real|reg|rfloor|rho|rlm|rsaquo|rsquo|sbquo|scaron|sdot|sect|shy|sigma|sigmaf|sim|spades|sub|sube|sum|sup|sup1|sup2|sup3|supe|szlig|tau|there4|theta|thetasym|thinsp|thorn|tilde|times|trade|uArr|uacute|uarr|ucirc|ugrave|uml|upsih|upsilon|uuml|weierp|xi|yacute|yen|yuml|zeta|zwj|zwnj)(;)?/g);
// 置換テーブル
var Entities = {'ne': 8800, 'le': 8804, 'para': 182, 'xi': 958, 'darr': 8595, 'nu': 957, 'oacute': 243, 'Uacute': 218, 'omega': 969, 'prime': 8242, 'pound': 163, 'igrave': 236, 'thorn': 254, 'forall': 8704, 'emsp': 8195, 'lowast': 8727, 'brvbar': 166, 'alefsym': 8501, 'nbsp': 160, 'delta': 948, 'clubs': 9827, 'lArr': 8656, 'Omega': 937, 'quot': 34, 'Auml': 196, 'cedil': 184, 'and': 8743, 'plusmn': 177, 'ge': 8805, 'raquo': 187, 'uml': 168, 'equiv': 8801, 'laquo': 171, 'Epsilon': 917, 'rdquo': 8221, 'divide': 247, 'fnof': 402, 'chi': 967, 'Dagger': 8225, 'iacute': 237, 'rceil': 8969, 'sigma': 963, 'Oslash': 216, 'acute': 180, 'frac34': 190, 'upsih': 978, 'lrm': 8206, 'Scaron': 352, 'part': 8706, 'exist': 8707, 'nabla': 8711, 'image': 8465, 'prop': 8733, 'omicron': 959, 'zwj': 8205, 'gt': 62, 'aacute': 225, 'Yuml': 376, 'Yacute': 221, 'weierp': 8472, 'rsquo': 8217, 'otimes': 8855, 'kappa': 954, 'thetasym': 977, 'harr': 8596, 'Ouml': 214, 'Iota': 921, 'ograve': 242, 'sdot': 8901, 'copy': 169, 'oplus': 8853, 'acirc': 226, 'sup': 8835, 'zeta': 950, 'Iacute': 205, 'Oacute': 211, 'crarr': 8629, 'Nu': 925, 'bdquo': 8222, 'lsquo': 8216, 'Beta': 914, 'eacute': 233, 'egrave': 232, 'lceil': 8968, 'Kappa': 922, 'piv': 982, 'Ccedil': 199, 'ldquo': 8220, 'Xi': 926, 'cent': 162, 'uarr': 8593, 'hellip': 8230, 'Aacute': 193, 'ensp': 8194, 'sect': 167, 'Ugrave': 217, 'aelig': 230, 'ordf': 170, 'curren': 164, 'sbquo': 8218, 'macr': 175, 'Phi': 934, 'Eta': 919, 'rho': 961, 'Omicron': 927, 'sup2': 178, 'euro': 8364, 'aring': 229, 'Theta': 920, 'mdash': 8212, 'uuml': 252, 'otilde': 245, 'eta': 951, 'uacute': 250, 'rArr': 8658, 'nsub': 8836, 'agrave': 224, 'notin': 8713, 'Psi': 936, 'ndash': 8211, 'Ocirc': 212, 'sube': 8838, 'szlig': 223, 'micro': 181, 'not': 172, 'sup1': 185, 'middot': 183, 'iota': 953, 'ecirc': 234, 'lsaquo': 8249, 'thinsp': 8201, 'sum': 8721, 'ntilde': 241, 'scaron': 353, 'cap': 8745, 'atilde': 227, 'lang': 9001, 'isin': 8712, 'gamma': 947, 'Euml': 203, 'ang': 8736, 'upsilon': 965, 'Ntilde': 209, 'hearts': 9829, 'Tau': 932, 'Alpha': 913, 'spades': 9824, 'THORN': 222, 'dagger': 8224, 'int': 8747, 'lambda': 955, 'Eacute': 201, 'Uuml': 220, 'infin': 8734, 'Aring': 197, 'rlm': 8207, 'ugrave': 249, 'Egrave': 200, 'Acirc': 194, 'ETH': 208, 'oslash': 248, 'rsaquo': 8250, 'alpha': 945, 'Ograve': 210, 'Prime': 8243, 'mu': 956, 'ni': 8715, 'real': 8476, 'bull': 8226, 'beta': 946, 'icirc': 238, 'eth': 240, 'prod': 8719, 'larr': 8592, 'ordm': 186, 'perp': 8869, 'Gamma': 915, 'Pi': 928, 'reg': 174, 'ucirc': 251, 'psi': 968, 'tilde': 732, 'asymp': 8776, 'zwnj': 8204, 'Agrave': 192, 'Delta': 916, 'deg': 176, 'AElig': 198, 'times': 215, 'sim': 8764, 'Mu': 924, 'Otilde': 213, 'uArr': 8657, 'circ': 710, 'theta': 952, 'Rho': 929, 'sup3': 179, 'diams': 9830, 'tau': 964, 'Chi': 935, 'frac14': 188, 'oelig': 339, 'shy': 173, 'or': 8744, 'dArr': 8659, 'phi': 966, 'Lambda': 923, 'iuml': 239, 'rfloor': 8971, 'iexcl': 161, 'cong': 8773, 'ccedil': 231, 'Icirc': 206, 'frac12': 189, 'loz': 9674, 'rarr': 8594, 'cup': 8746, 'radic': 8730, 'frasl': 8260, 'euml': 235, 'OElig': 338, 'hArr': 8660, 'Atilde': 195, 'lt': 60, 'Upsilon': 933, 'there4': 8756, 'ouml': 246, 'oline': 8254, 'Ecirc': 202, 'yacute': 253, 'amp': 38, 'auml': 228, 'sigmaf': 962, 'permil': 8240, 'iquest': 191, 'empty': 8709, 'pi': 960, 'Ucirc': 219, 'supe': 8839, 'Igrave': 204, 'yen': 165, 'rang': 9002, 'trade': 8482, 'lfloor': 8970, 'minus': 8722, 'Zeta': 918, 'sub': 8834, 'epsilon': 949, 'Sigma': 931, 'yuml': 255, 'Iuml': 207, 'ocirc': 244};
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