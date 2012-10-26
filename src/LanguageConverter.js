/*jslint browser: true, white: true, todo: true, continue: true, forin: true, vars: true, devel: true, regexp: true */
/*global jQuery, mediaWiki, LanguageConverter, self, removeSpinner, injectSpinner */
/**
 * Based on [[oldwikisource:MediaWiki:Modernisation.js]]
 * @author [[:fr:User:ThomasV]]
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Scripts/LanguageConverter.js]] ([[File:User:Helder.wiki/Scripts/LanguageConverter.js]])
 *
 * RELEASE NOTES:
 * Translation and addition of basic support to Portuguese;
 * Addition of "span" elements around converted text, for easy identification of changes (a basic "diff");
 * Adoption of menus on top, as in LanguageConverter.php, from MediaWiki;
 * Use of URL parameter "variant" to define the variant for conversion;
 * Support to multiple languages (like French, Norwegian, Portuguese and Galician);
 * Addition of error handling when converting each expression;
 * Better internal documentation, using conventions of from JSDoc;
 * Addition of a "spinner" during conversion;
 * Expansion of sets of characters (the "alphabets" used);
 * Support to comments in the end of lines in dictionary pages;
 * Addition of parameter to customize the set of pages where the script is enabled (by namespace and/or manual markup on individual pages);
 * Better support to conversion of strings with more than one word;
 * Optimization of some parts and some bug fixing;
 * Better support to creation of local dictionaries in specific pages;
 * Addition of link to help page (by wikiproject)
 * Use of jQuery in some places;
 * Better use of JavaScript objects and closures;
 * Support to dictionaries in external wikiprojects
 * Support to multiple dictionaries per variant/language (e.g. main and secundary dictionaries)
 * Use of a cookie to store the last variant selected (define jQuery.cookie if not defined)
 * Fixed conversion of text in spans created by the script itself
 * (Re)added monobook skin compatibility
 * Added class to disable conversion of some elements in a page
 * Regexes for typographic changes are created only when conversion starts (instead of recreated when converting each HTML element)
 * Updated to use MW 1.17 default JavaScript modules
 * Added some debug messages using mw.log
 * Replaced some functions by jQuery equivalents (e.g. $.extend to override settings, $.ajax to access the API)
 * Avoided conversion of the content of diffs
 * Escaped HTML and typo changes
 * Removed unused parameters
 */

/**
 * Setup the Language Converter global:
 */
if ( window.LanguageConverter === undefined ) {
    window.LanguageConverter = {};
}

/**
 * The global Language Converter object
 */
( function ( mw, $, lc ) {
'use strict';

mw.log('Loaded LanguageConverter.js source file');

/**
 * Set the current version
 */
lc.version = '2.33';
mw.log('LanguageConverter version is ' + lc.version );

// The cookie used by Language Converter
lc.cookie = mw.config.get( 'wgDBname' ) + '-lang-variant';

/**
* Dictionary to be used during the conversion
*/
if ( lc.dictionary === undefined ) {
	lc.dictionary = {};
}

/**
* Used by {@link lc.render_navigation}
*/
lc.variant_links = {};

/**
* Indicates if the content of page wasn't converted yet
* Used by {@link lc.render_navigation} and {@link lc.conv_callback}
*/
lc.original_text = true;

/**
	* Getter for localized messages. Precedence order:
	* value from current variant, value from wgContentLanguage, english value.
	* @requires wgContentLanguage
	*/
lc.getLocalMsg = function ( name ) {
	var	msgs = lc.settings.msg,
		msg = msgs[name];
	if( typeof msg === 'string' ) {
		return msg;
	}
	if ( typeof msg === 'object' ) {
		if( msg[ lc.lang ] ) {
			return msg[ lc.lang ];
		}
		if ( msg[ mw.config.get( 'wgContentLanguage' ) ] ) {
			return msg[ mw.config.get( 'wgContentLanguage' ) ];
		}
		if ( msg.en ){
			return msg.en;
		}
	}
	return false;
};

/**
* @author Based on function getURLVariant() from /languages/LanguageConverter.php
* @return {?string} The variant name in URL or null if not found
*/
lc.get_URL_variant = function () {
	var	ret = mw.util.getParamValue( 'variant' ),	// || mw.util.getParamValue( 'uselang' )
		variants = lc.settings.variants_list;
	if ( variants[ret] ) {
		return ret;
	}
	return null;
};

/**
* @return {?string} The variant name saved in cookie or null if not found
*/
lc.get_cookie_variant = function () {
	var	ret = $.cookie( lc.cookie ),
		variants = lc.settings.variants_list;
	if ( variants[ret] ) {
		return ret;
	}

	return null;
};

/**
* @author Based on function getPreferredVariant() from /languages/LanguageConverter.php
* @return {(string)} The variant name in URL or content language code if not found
* @requires wgContentLanguage
*/
lc.get_preferred_variant = function () {
	var req = lc.get_URL_variant()
		|| lc.get_cookie_variant()
		|| mw.config.get( 'wgContentLanguage' );

	return req;
};

/**
* Add or remove the class 'show-changes' to/from content div
*/
lc.toggle_visibility = function () {
	// TODO: Consider the use of two variables: show_changes and enable_show_changes.
	var show = !lc.settings.show_changes;
	lc.settings.show_changes = show;
	$('#content').toggleClass('show-changes', show);
	$('#ca-conv-show-hide-changes > a').text(
		show?
		lc.getLocalMsg( 'hide_changes_link' ) :
		lc.getLocalMsg( 'show_changes_link' )
	);
};

/**
* @author Based on analogous function from skins/vector.php
* @requires wgScript, wgPageName, wgContentLanguage
*/
lc.render_navigation = function () {
	mw.log('Started rendering of navigation');
	var	list = lc.settings.variants_list,
		v, show, lnk, html, lnav, lclist, newPortlet, ptb;
	for( v in list ){
		if ( list[v] === null ) {
			continue;
		}
		lc.variant_links[v] = {};
		//TODO: Use "with lc.variant_links[v]" or a local variable...
		lc.variant_links[v].text = list[v];
		if ( v === lc.lang ) {
			lc.variant_links[v].sel = true;
			lc.variant_links[v].href = '#';
		} else {
			lc.variant_links[v].sel = false;
			// Only use the current HTML if the text wasn't converted yet
			// (may have better results?)
			lc.variant_links[v].href = lc.original_text ?
				'javascript:LanguageConverter.startConversion(\'' + v + '\');' :
				mw.util.wikiGetlink( mw.config.get( 'wgPageName' ) ) + '?variant=' + v;
		}
	}
	if ( lc.settings.help_page && lc.getLocalMsg( 'help_page_link' ) ) {
		lc.variant_links['help-page'] = {
			'text' : lc.getLocalMsg( 'help_page_link' ),
			'sel' : false,
			'href' : mw.util.wikiGetlink( lc.settings.help_page )
		};
	}
	show = lc.settings.show_changes;
	if ( lc.getLocalMsg( 'show_changes_link' ) && lc.getLocalMsg( 'hide_changes_link' ) ) {
		lc.variant_links['show-hide-changes'] = {
			'text' : show? lc.getLocalMsg( 'hide_changes_link' ) : lc.getLocalMsg( 'show_changes_link' ),
			'sel' : false,
			'href' : 'javascript:LanguageConverter.toggle_visibility();'
		};
	}
	$('#content').toggleClass('show-changes', show);
	switch( mw.config.get( 'skin' ) ) {
		case 'vector':
			lnav = document.getElementById('left-navigation');

			html = '<div id="p-variants-js" class="vectorMenu">';
			if ( lc.settings.show_menu_title ) {
				html += '<h4 class="flag-' + lc.lang + '">';
				for( v in lc.variant_links ){
					lnk = lc.variant_links[v];
					if ( lnk.sel ) {
						html += lnk.text;
						continue;
					}
				}
				html += '</h4>';
			}
			html += '<h5><span>' + lc.getLocalMsg( 'menu_title' ) +
				'</span><a href="#"></a></h5><div class="menu"><ul>';
			for( v in lc.variant_links ){
				lnk = lc.variant_links[v];
				html += '<li id="ca-conv-' + v + '"';
				if ( lnk.sel ) {
					html += ' class="selected"';
				}
				html += '><a href="' + lnk.href + '">' + lnk.text + '</a></li>';
			}
			html += '</ul></div></div>';
			lnav.innerHTML += html;
			break;
		case 'monobook':
			/**
			* Create a new Portlet section for monobook skin
			* @author Based on function get_optlist() from
			* http://wikisource.org/wiki/MediaWiki:Base.js
			* and function toolbox() from skins/MonoBook.php
			*/
			lclist = document.getElementById( 'p-variants-js' );

			html = '<h5>' + lc.getLocalMsg( 'menu_title' ) +
				'<\/h5><div class="pBody"><ul>';
			for( v in lc.variant_links ){
				lnk = lc.variant_links[v];
				html += '<li id="ca-conv-' + v + '"><a href="' +
					lnk.href + '">' + lnk.text + '</a></li>';
			}
			html += '</ul><\/div>';
			if( !lclist ) {
				newPortlet = document.createElement( 'div' );
				newPortlet.className = 'portlet';
				newPortlet.innerHTML = html;
				newPortlet.setAttribute( 'id', 'p-variants-js' );
				newPortlet.id = 'p-variants-js';
				ptb = document.getElementById('p-tb');
				ptb.parentNode.insertBefore( newPortlet, ptb);
			}
			break;
		default:
			//Currently, other skins are not supported
	}
	$('#ca-conv-show-hide-changes').toggle( lc.lang !== mw.config.get( 'wgContentLanguage' ) );
	mw.log('Finished rendering of navigation');
};

/**
* @param {string} text The text whose typography will be modernized
* @return {string} The modernized text
*/
lc.conv_typo_text = function ( text ) {
	var	ch,
		rule,
		max = lc.regTypoChanges.length;
	for ( ch = 0 ; ch < max; ch += 1 ) {
		rule = lc.regTypoChanges[ch];
		try {
			text = text.replace( rule[0], rule[1] );
		} catch( err ) {
			alert(
				lc.getLocalMsg( 'error_typo_processing' ) +
				rule[0] + ': ' + rule[1] +'.\n\n' +
				err.message
			);
		}
	}
	return text;
};

/**
* @param node The node whose text descendant nodes will be modernized
*/
lc.conv_typo_node = function ( node ) {
	var i;
	if ( node.nodeType === 3 ) {
		node.data = lc.conv_typo_text( node.data );
	} else {
		for ( i = 0; i < node.childNodes.length; i += 1 ) {
			if ( node.id !== 'editform' && !node.className.match( lc.regClass ) ) {
				lc.conv_typo_node( node.childNodes[i] );
			}
		}
	}
};

/**
* Modernize the typography of the document content
*/
lc.conv_typo_document = function () {
	mw.log('Started "lc.conv_typo_document" function');
	if ( !lc.isAllowed() ) {
		mw.log('Language converter is not allowed on this page. Returning');
		return;
	}
	document.title = lc.conv_typo_text( document.title );
	lc.conv_typo_node( document.getElementById('content') );
	mw.log('Finished "lc.conv_typo_document" function');
};

/**
* reexp split a string
* @author Based on http://stevenlevithan.com/assets/misc/split.js
*/
lc.reg_split = function ( str, separator ) {

	var	output = [],
		lastLastIndex = 0,
		flags = (separator.ignoreCase ? 'i' : '') +
			(separator.multiline  ? 'm' : '') +
			(separator.sticky     ? 'y' : ''),
		separator2, match, lastIndex, lastLength;
	// make 'global' and avoid 'lastIndex' issues
	separator = new RegExp(separator.source, flags + 'g');

	var compliantExecNpcg = /()??/.exec('')[1] === undefined;

	str = String( str ); // type conversion
	if (!compliantExecNpcg) {
		// doesn't need /g or /y, but they don't hurt
		separator2 = new RegExp('^' + separator.source + '$(?!\\s)', flags);
	}
	match = separator.exec(str);
	var setUndefinedGroups = function () {
		var i;
		for (i = 1; i < arguments.length - 2; i += 1) {
			if (arguments[i] === undefined) {
				match[i] = undefined;
			}
		}
	};
	while (match) {
		// 'separator.lastIndex' is not reliable cross-browser
		lastIndex = match.index + match[0].length;

		if (lastIndex > lastLastIndex) {
			output.push(str.slice(lastLastIndex, match.index));

			// fix browsers whose 'exec' methods don't consistently return
			// 'undefined' for nonparticipating capturing groups
			if (!compliantExecNpcg && match.length > 1) {
				match[0].replace(separator2, setUndefinedGroups);
			}
			if (match.length > 1 && match.index < str.length) {
				Array.prototype.push.apply(output, match.slice(1));
			}
			lastLength = match[0].length;
			lastLastIndex = lastIndex;
		}

		if (separator.lastIndex === match.index) {
			separator.lastIndex += 1; // avoid an infinite loop
		}
		match = separator.exec(str);
	}

	if (lastLastIndex === str.length) {
		if (!separator.test('') || lastLength) {
			output.push('');
		}
	} else {
		output.push(str.slice(lastLastIndex));
	}

	return output;
};

/**
* Modernize the text using the current dictionary
* @param {string} text The text to be modernized
* @param {boolean} returnHTML
* @return {?string|Object} The converted text or null if not changed
* @requires wgContentLanguage
*/
lc.conv_text_from_dic = function (text, returnHTML) {
	var i, j, len, num, ex,
		re_word_chars = new RegExp( '([^' + lc.settings.word_chars + ']+)', '' ),
		list = lc.reg_split( text, re_word_chars ),
		hasChanged = null,
		dict = lc.dictionary,
		span, w, pw, nw, sub_w, first_w, sup_w;

	text = '';
	if ( returnHTML ) {
		span = ['<span class="v-' + lc.lang + '" title="', null, '">', null,'</span>'];
	}

	outer_loop:
	for ( i = 0, len = list.length; i < len; i += 1 ) {
		w = list[i];
		if (!w) {
			continue;
		}

		try {
			// lookahead search
			// Try to match (lc.max_seq) consecutive words,
			// then (lc.max_seq-1), ...
			// then a single word
			for ( num = lc.settings.max_seq; num > 0; num -= 1 ) {
				if ( len <= i + 2*(num-1) ) {
					continue;
				}

				for ( j = 1, ex = w; j < num; j += 1 ) {
					ex += ' ' + list[i + 2*j];
				}

				nw = ( dict.hasOwnProperty( ex ) )? dict[ex]: null;

				if ( !nw ) {
					sub_w = ex.toLowerCase();
					first_w = ex[0].toUpperCase() + sub_w.substring(1);
					sup_w = ex.toUpperCase();
					if (sup_w === ex) {
						if ( dict.hasOwnProperty( first_w ) ) {
							nw = dict[first_w].toUpperCase();
						} else {
							if ( dict.hasOwnProperty( sub_w ) ) {
								nw = dict[sub_w].toUpperCase();
							}
						}
					} else if ( first_w === ex ) {
						if ( dict.hasOwnProperty( sub_w ) ) {
							nw = dict[sub_w][0].toUpperCase() + dict[sub_w].substring(1);
						}
					}
				}
				if ( nw ) {
					if ( returnHTML ) {
						span[1] = mw.html.escape( ex );
						span[3] = mw.html.escape( nw );
						text += span.join('');
					} else {
						text += mw.html.escape( nw );
					}
					hasChanged = true;
					// and then +1 from loop
					i += 2*num - 2;
					continue outer_loop;
				}
			}
			if('&' === w && 'fr' === mw.config.get( 'wgContentLanguage' )) {
				pw = list[i-2];
				nw = ( pw && pw===pw.toUpperCase() )? 'ET' : 'et';

				if ( returnHTML ) {
					span[1] = mw.html.escape( w );
					span[3] = mw.html.escape( nw );
					text += span.join('');
				} else {
					text += mw.html.escape( nw );
				}
				hasChanged = true;
			}
			else {
				text += mw.html.escape( w );
			}
		} catch(err) {
			alert(
				lc.getLocalMsg( 'error_word_processing' ) + list[i] + '.\n\n' +
				err.message
			);
		}
	}
	if ( hasChanged ) {
		return text;
	}
	return null;
};

/**
* Modernize the text using the dictionary provided
* @param {Object} node The node whose text descendant nodes will be modernized
*/
lc.conv_node_from_dic = function ( node ) {
	var	data, i,
		showChanges = true; // || lc.show_changes;
	if ( node.nodeType === 3 ) {
		data = lc.conv_text_from_dic( node.data, showChanges );
		if( data ) {
			$( node ).replaceWith( data );
		}
	} else {
		for ( i = 0; i < node.childNodes.length; i += 1 ) {
			if ( node.id !== 'editform' && !node.className.match( lc.regClass ) ) {
				lc.conv_node_from_dic( node.childNodes[i] );
			}
		}
	}
};

/**
* If dictionary does not exist, create it
* @param {Object} res Content of dictionary page in JSON
* @requires wgContentLanguage
*/
lc.conv_callback = function ( res ) {
	mw.log('Started "lc.conv_callback" function');
	lc.conv_typo_document();

	var	query, pages, pageids,
		pagenames = lc.settings.global_dic_page[ lc.lang ],
		sortable = [],
		str, lines, line, data, li, h4, a, v,
		i, id, mm, match2, list, showChanges;
	if ( !pagenames ){
		alert( lc.getLocalMsg( 'error_missing_dict_name' ) + lc.lang );
		// FIXME: Use the new 'jquery.spinner' module
		// https://gerrit.wikimedia.org/r/gitweb?p=mediawiki/core.git;a=blob;f=resources/jquery/jquery.spinner.js;
		removeSpinner( 'var-spinner' );
		return false;
	}
	if( res ){
		query = res.query;
		if( query ){
			pages = query.pages;
			pageids = query.pageids;
		}
		if ( !query || !pages || !pageids ){
			mw.log( 'The API request returned incomplete data.' );
			// FIXME: Use the new 'jquery.spinner' module
			removeSpinner( 'var-spinner' );
			return false;
		}
	} else {
		mw.log( 'The API request returned no data.' );
		// FIXME: Use the new 'jquery.spinner' module
		removeSpinner( 'var-spinner' );
		return false;
	}
	if ( typeof pagenames === 'object' ) {
		pagenames = pagenames.pages || pagenames.page;
	}
	pagenames = pagenames.split('|');

	for (i = 0; i < pageids.length; i += 1 ) {
		if( !pages[ pageids[i] ].pageid ){
			alert( lc.getLocalMsg( 'error_missing_dict' ) + pages[ pageids[i] ].title );
			continue;
		}

		sortable.push([
			pages[ pageids[i] ].revisions[0]['*'], //Wiki code of dictionary page
			pagenames.indexOf(pages[ pageids[i] ].title) //Order of page
			//,pages[ pageids[i] ].title //Title of page
		]);
	}
	// Sort dictionaries in the given order
	sortable.sort(function(a, b) {return a[1] - b[1];});

	for ( i = 0; i < sortable.length; i += 1 ) {
		str = sortable[ i ][ 0 ];
		lines = str.split('\n');
		for( line in lines ) {
			//Current syntax: * old word : new word //Some comment
			match2 = /^\*\s*(\S[^:]*?)\s*:\s*([\S].*?)\s*(?:\/\/.*?)?$/.exec( lines[line] );
			if( match2 ) {
				lc.dictionary[ match2[1] ] = match2[2];
				continue;
			}
		}
	}
	id = lc.settings.local_dic_id;
	if ( id ) {
		id = id[ lc.lang ];
	}
	mm = id? document.getElementById( id ) : null;
	if ( mm ) {
		str = mm.innerHTML;
		lines = str.split('\n');
		for( i in lines ) {
			match2 = /^<li>\s*(\S[^:]*?)(?:\s|&#160;|&nbsp;)*:\s*([\S].*?)\s*(?:\/\/.*?)?<\/li>$/i.exec(lines[i]);
			if( match2 ) {
				lc.dictionary[ match2[1] ] = match2[2];
				continue;
			}
		}
	}
	$.cookie( lc.cookie, lc.lang, {
		expires: 7, // expires in 7 days
		path: '/', // domain-wide, entire wiki
		secure: lc.secure
	} );
	// Do not return HTML for title
	showChanges = false;
	data = lc.conv_text_from_dic( document.title, showChanges );
	if ( data ) {
		document.title = data;
	}
	lc.conv_node_from_dic( document.getElementById('content') );

	//Update menu links
	list = lc.settings.variants_list;
	for( v in list ){
		if ( list[v] === null ) {continue;}
		li = document.getElementById( 'ca-conv-' + v );
		if ( !li ) {continue;}
		a = li.firstChild;
		if ( !a ) {continue;}
		if( v === lc.lang ) {
			li.className = 'selected';
			a.href = '#';
		} else {
			li.className = '';
			//If already converted, it is better reload the page
			a.href = mw.util.wikiGetlink( mw.config.get( 'wgPageName' ) ) +
				'?variant=' + v;
		}
	}
	if ( lc.settings.show_menu_title ) {
		h4 = document.getElementById('p-variants-js').firstChild;
		if ( h4 ) {
			h4.innerHTML = list[lc.lang];
			h4.className = 'flag-' + lc.lang;
		}
	}
	$('#ca-conv-show-hide-changes').toggle( lc.lang !== mw.config.get( 'wgContentLanguage' ) );
	lc.original_text = false;
	// FIXME: Use the new 'jquery.spinner' module
	removeSpinner( 'var-spinner' );
	mw.log('Finished "lc.conv_callback" function');
};

/**
* Gets the dictionary and do the modernization
* @param {string} l The language code
*/
lc.startConversion = function ( l ){
	mw.log('Started conversion to "' + l + '"');
	var ch, re, dicts, changes, change, api, type, x;

	//if (undefined === l) l = lc.get_preferred_variant()
	x = document.getElementById('p-variants-js');
	if ( x ) {
		// FIXME: Use the new 'jquery.spinner' module
		injectSpinner(x, 'var-spinner');
	}
	lc.lang = l;
	// The following is used to avoid conversion in places such as:
	// * Spans created by the script itself
	// * Content of diffs
	// * Tags marked by users
	lc.regClass = new RegExp(
		'(?:\\s|^)(?:v-' + lc.lang + '|diff-(?:context|deletedline|addedline)|' + lc.settings.no_conversion_class + ')(?:\\s|$)'
	);
	lc.regTypoChanges = [];
	changes = lc.settings.typo_changes;
	if( changes ) {
		//This is an object or array of changes
		changes = changes[ lc.lang ];
	}
	if( changes ) {
		if ( changes.constructor === Array ){
			for ( ch = 0; ch < changes.length; ch += 1 ) {
				change = changes[ ch ];
				if ( change.length !== 2 || change[1] === null ) {
					continue;
				}
				if ( typeof change[0] === 'string' ) {
					change[0] = new RegExp( $.escapeRE( change[0] ), 'g' );
				}
				lc.regTypoChanges.push( change );
			}
		} else if ( changes.constructor === Object ) {
			for ( ch in changes ) {
				if ( !changes.hasOwnProperty || changes[ ch ] === null ) {
					continue;
				}
				try {
					re = new RegExp( $.escapeRE( ch ), 'g' );
					lc.regTypoChanges.push( [ re, changes[ ch ] ] );
				} catch(err) {
					alert(
						lc.getLocalMsg( 'error_typo_processing' ) +
						ch + ': ' + changes[ch] +'.\n\n' + err.message
					);
				}
			}
		}
	}
	dicts = lc.settings.global_dic_page[ lc.lang ];
	if ( typeof dicts === 'object' ) {
		api = dicts.api;
		if ( typeof api === 'object' && api.length === 2 ) {
			if ( lc.secure ) {
				api = api[1];
			} else {
				api = api[0];
			}
		}
		dicts = dicts.pages || dicts.page;
		// Same origin check
		type = api === mw.config.get( 'wgServer' ) + mw.util.wikiScript( 'api' ) ? 'json' : 'jsonp';
	} else {
		api = mw.util.wikiScript( 'api' );
		type = 'json';
	}
	$.ajax({
		url: api,
		dataType: type,
		data: {
			'format': 'json',
			'action': 'query',
			'titles': dicts,
			'prop': 'revisions',
			'rvprop': 'content',
			'indexpageids': '1'
		},
		success: lc.conv_callback
	});
	mw.log('Finished conversion');
};
/*
* @requires wgContentLanguage
*/
lc.isAllowed = function () {
	var	nslist = lc.settings.ns_list,
		isInNS = ( '*' === nslist ) || nslist[ mw.config.get( 'wgNamespaceNumber' ) ],
		ids = lc.settings.local_dic_id,
		isMarked = ids[ mw.config.get( 'wgContentLanguage' ) ]?
			document.getElementById( ids[ mw.config.get( 'wgContentLanguage' ) ] ) :
			false;

	switch ( lc.settings.selection_mode ) {
	case 'AND':
		if ( !isInNS || !isMarked ) {
			return false;
		}
		break;
	case 'OR':
		if ( !isInNS && !isMarked ) {
			return false;
		}
		break;
	}
	return true;
};

/**
* Adds the modernization menu when necessary
*/
lc.load = function () {
	mw.log('Started "lc.load" function');
	lc.settings = {
		msg: {
			error_missing_dict	 : 'The following dictionary was not found:\n',
	error_missing_dict_name : 'It is necessary to define the page name of the dictionary for ',
			error_word_processing	 : 'Error has occurred while processing the following word:\n',
			error_typo_processing	 : 'Error has occurred while processing the following typographic change:\n',
			help_page_link		 : 'Open help page',
			show_changes_link	 : 'Show changes',
			hide_changes_link	 : 'Hide changes',
			menu_title		 : 'Variants'
		},
		/**
			* TODO: Use by default some general regex for word bondaries, as in
			* http://www.unicode.org/reports/tr29/#Default_Word_Boundaries
			*/
		word_chars	 : 'a-zA-Z\'-',

		/**
			* Typographic conversion (applied before dictionary conversion)
			*/
		typo_changes	 : {},

		/**
		* Names of each language and/or variant to which conversion is enabled
		* in the current wiki
		*/
		variants_list	 : {},

		/**
		* List of namespaces where conversion is enabled.
		* The exact behavior depends on {@link lc.selection_mode} and
		* the presence of an element whose id attribute is
		* the value of {@link lc.local_dic_id}
		* @see lc.selection_mode
		* @see lc.local_dic_id
		*/
		ns_list		 : { 0 : true },

		/**
		* Id used in template or wikitext to enable conversion to some variant
		* @see lc.ns_list
		* @see lc.selection_mode
		*/
		local_dic_id	 : 'modernization',

		/**
		* Class used in template or wikitext to disable conversion
		* of the content inside of an HTML element
		*/
		no_conversion_class : 'no-conversion',

		/**
		* Page of current wiki where the dictionaries for each variant should be defined
		*/
		global_dic_page	 : 'Project:Dictionary',

		/**
		* Help page about the conversion system, for each wiki
		*/
		help_page	 : 'Project:Language Converter',

		/**
		* Enables the addition of a span around each converted expression
		* (for dictionary, not typographic conversion)
		*/
		show_changes	 : false,

		/**
		* Enables the exibition of the text of selected item in the menu title
		*/
		show_menu_title	 : true,

		/**
		* Defines how to select pages where the conversion is enabled
		* @see lc.ns_list
		* @see lc.local_dic_id
		*/
		selection_mode	 : 'AND',

		/**
		* How many words in sequence can be converted as a "phrase"
		*/
		max_seq		 : 3
	};

	//Override default settings above by specific wiki configuration, if any
	$.extend(true, lc.settings, lc.config);

	if ( !lc.isAllowed() ) {
		mw.log('Language converter is not allowed on this page. Returning');
		return;
	}
	lc.secure = location.protocol === 'https:';

	/**
		* Variant currently selected
		* Used by {@link lc.render_navigation}, {@link lc.conv_typo_text},
		* {@link lc.conv_text_from_dic}, {@link lc.conv_callback},
		* {@link lc.startConversion} and {@link mod_lookup}
		*/
	lc.lang = lc.get_preferred_variant();
	mw.log('Prefered variant is "' + lc.lang + '"');
	$.cookie( lc.cookie, lc.lang, {
		expires: 7, // expires in 7 days
		path: '/', // domain-wide, entire wiki
		secure: lc.secure
	} );
	lc.render_navigation();
	if ( lc.lang !== mw.config.get( 'wgContentLanguage' ) ) {
		lc.startConversion( lc.lang );
	}
	mw.log('Finished "lc.load" function');
};

mw.log('The loader function will be called once mw and mw.util are loaded');
mw.loader.using( ['jquery.cookie', 'mediawiki.util'], function() {
	mw.log(
		'Loaded mw and mw.util (test: typeof mw.util.getParamValue=' +
		typeof mw.util.getParamValue + '). Calling the loader now.'
	);
	$( lc.load );
} );

// See also [[s:fr:MediaWiki:Gadget-mod.js]] and [[Wikisource:Scriptorium/Août_2009#typographie]]
if(self.gadget_typographie && !self.gadget_mod2) {
	$( lc.conv_typo_document );
}

}( mediaWiki, jQuery, LanguageConverter ) );