$(function(){
	var includeSnippets = {},
		defaultSnippets = {};
	$('#post .inline-editor').each(function(index){
		var editor = $(this);
		var toolbar = $('<div class="toolbar"></div>').appendTo(editor);
		var elem = $('<div>').appendTo(editor);
		var aceEditor = ace.edit(elem[0]);
		aceEditor.setTheme('ace/theme/tomorrow');
		var result = $('<div class="result">').appendTo(editor);
		result.append('<div class="inline-log"></div>');
		result.append('<a class="button blue">Edit</a>');

		result.find('.button').click(function(){
			result.animate({top:'100%'},'fast', function(){
				result.find('iframe').remove();
				result.find('.inline-log').empty();
			});
		});
		var systemCode = [];
		editor.find('pre[data-system]').each(function(){
			var pre = $(this);
			systemCode.push({
				code: pre.text(),
				include: pre.data('include')
			});
			pre.remove();
		});
		window['inlineEditorMessage'+index] = function(arr, type){
			if(type == 'error'){
				result.find('.inline-log').append('<div class="error">' + arr[0] + ' on line ' + arr[2] + '</div>');
			}
			else{
				var arr = Array.prototype.slice.call(arr);
				try {
					$.each(arr, function(k) {
						if ($.isPlainObject(this) || $.isArray(this)) {
							arr[k] = JSON.stringify(this);
						}
					});
				} catch (e) {}
				result.find('.inline-log').append('<div class="log">' + arr.join(' ').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>');
				window.console && console.log.apply(console, arr);
			}
		};
		toolbar.on('click', 'span', function(e, simulated){
			toolbar.find('span').removeClass('active');
			var tab = $(this);
			aceEditor.setSession(tab.data('session'));
			aceEditor.resize();
			tab.addClass('active').data('editor');
			if(!simulated){
				aceEditor.focus();
			}
			aceEditor.setReadOnly(tab.hasClass('locked'));
		});
		rebuildEditor();
		$('<div class="reset" title="Reset"></div>').click(function(){
			if(confirm('Reset the editor? All your changes will be lost.')){
				rebuildEditor(true);
			}
		}).appendTo(toolbar);
		var run = $('<a class="button blue">Run</a>').click(function(){
			var code = {};
			toolbar.find('span').each(function(tabIndex){
				var tab = $(this);
				code[tab.data('type')] = code[tab.data('type')] || [];
				if(!tab.data('protected')){
					sessionStorage[the_id + '#' + index + '-' + tabIndex] = tab.data('session').getValue();
				}
				if(tab.data('type') == 'js' && tab.data('protected')){
					var include = '';
					if(tab.data('include') && includeSnippets[tab.data('include')] !== undefined){
						include = includeSnippets[tab.data('include')] + ';';
					}
					code['js'].unshift('(function(){ ' + include + tab.data('session').getValue() + ' })();');
				}
				else if(tab.data('type') == 'js' && tab.data('include')){
					code['js'].push(includeSnippets[tab.data('include')]);
					code['js'].push(tab.data('session').getValue());
				}
				else{
					code[tab.data('type')].push(tab.data('session').getValue());
				}
			});
			if(systemCode.length){
				$.each(systemCode, function(){
					var c = '';
					if(this.include){
						c = '(function(){' + includeSnippets[this.include] + '; ' + this.code + '})();'
					}
					else{
						c = this.code;
					}
					code['js'].unshift(c);
				});
			}
			var html = buildFrameMarkup(code, editor.data('includes'));
			var iframe = document.createElement('iframe');
			iframe.src = 'about:blank';
			iframe.frameBorder="0";
			iframe.height = result.outerHeight() - 85;
			result.remove('iframe').append(iframe);
			iframe.contentWindow.document.open('text/html', 'replace');
			iframe.contentWindow.document.write(html);
			iframe.contentWindow.document.close();
			result.animate({top:0}, 'fast');
		}).appendTo(editor);
		if(editor.data('autorun')){
			setTimeout(function(){
				run.click();
			}, 250 + (250 * index));
		}
		function rebuildEditor(force) {
			toolbar.find('span').remove();
			editor.find('pre').each(function(preIndex) {
				var pre = $(this),
					type = $.trim(pre.data('type')),
					text = sessionStorage[the_id + '#' + index + '-' + preIndex],
					language = type.replace('js', 'javascript');
				if(force || !text){
					text = pre.text();
				}
				var tab = $('<span>' + (pre.data('name') || type) + '</span>');
				tab.data('type', type);
				tab.data('session', createEditSession(text, language));
				if(pre.data('include')){
					tab.data('include', pre.data('include'));
				}
				if(pre.data('protected')){
					tab.addClass('locked');
					tab.data('protected', true);
				}
				tab.appendTo(toolbar);
			});
			toolbar.find('span').first().trigger('click', [true]);
		}
		function createEditSession(text, mode){
			var EditSession = ace.require('ace/edit_session').EditSession;
			var UndoManager = ace.require('ace/undomanager').UndoManager;
			var session = new EditSession(text, 'ace/mode/' + mode);
			session.setUndoManager(new UndoManager());
			session.setUseWorker(false);
			return session;
		}
		function buildFrameMarkup(code, libraryURLs){
			for(var k in defaultSnippets){
				if(!code.hasOwnProperty(k)){
					code[k] = [defaultSnippets[k]];
				}
			}
			var headjs = '<script>{js}</script>';
			if($.type(libraryURLs) === 'array' && libraryURLs.length > 0){
				headjs = '<script src="http://cdnjs.cloudflare.com/ajax/libs/headjs/0.99/head.min.js"></script>';
				headjs += '<script>head.js("' + libraryURLs.join('", "') +'", function(){ {js} });</script>';
			}
			else {
				headjs = '<script>document.addEventListener("DOMContentLoaded", function _l(){\n\
							document.removeEventListener("DOMContentLoaded", _l, false);\n\
							{js}\n\
							(function(){var _d = document.createEvent("Event");\n\
								_d.initEvent("DOMContentLoaded", true, true);\n\
								window.document.dispatchEvent(_d);\n\
							})();\n\
						}, false);</script>';
			}
			if(code.js){
				var tmp = "window.onerror = function(){\
					window.parent.inlineEditorMessage"+index+"(arguments,'error'); return true;};\
					window.console = window.console || {}; console.log = function(){\
						window.parent.inlineEditorMessage"+index+"(arguments,'log');};";

				for(var i = 0; i < code.js.length; i++){
					tmp += "var script = document.createElement('script');\
						script.textContent = " + JSON.stringify(code.js[i]).replace(/<\/script>/g, '<\\/script>') + ";\
						document.body.appendChild(script);";		
				}
				code.js = tmp;
			}
			if(code.html) code.html = code.html.join('');
			if(code.css) code.css = code.css.join('');
			var html = "<!doctype html>\n\
						<html>\n\
							<head>\n\
								<meta charset='utf-8'>\n\
								<style>{css}</style>\n\
								" + headjs + "\n\
							</head>\n\
							<body>\n\
							{html}\n\
							</body>\n\
						</html>";
			return html.replace(/\{(\w+)\}/g, function(match, group){
				if(group in code) {
					if(group == 'html' || group == 'js' || group == 'css'){
						return code[group];
					}
					return code[group].replace(/</g, '&lt;').replace(/>/g, '&gt;');
				}
				return '';
			});
		}
	});
});
