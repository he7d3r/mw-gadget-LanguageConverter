/*jslint browser: true, white: true, todo: true, continue: true, forin: true, vars: true, devel: true, regexp: true */
/*global jQuery, mediaWiki, LanguageConverter, self */
/**
 * Based on [[oldwikisource:MediaWiki:Modernisation.js]]
 * @author: [[:fr:User:ThomasV]]
 * @author: [[w:fr:User:Phe]]
 * @author: [[s:fr:User:Tpt]] (https://github.com/Tpt)
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
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

/**
 * Set the current version
 */
lc.version = '2.35';

// The cookie used by Language Converter
lc.cookie = mw.config.get( 'wgCookiePrefix' ) + '-lang-variant';

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
* Indicates if the next conversion requires a page reload
* Used by {@link lc.render_navigation} and {@link lc.conv_callback}
*/
lc.mustReload = false;

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
	var req = lc.get_URL_variant() ||
		lc.get_cookie_variant() ||
		mw.config.get( 'wgContentLanguage' );

	return req;
};

/**
* Add or remove the class 'show-changes' to/from content div
*/
lc.toggle_visibility = function () {
	// TODO: Consider the use of two variables: show_changes and enable_show_changes.
	var show = !lc.settings.show_changes;
	lc.settings.show_changes = show;
	lc.$target.toggleClass('show-changes', show);
	$('#ca-conv-show-hide-changes').find('a').text(
		show?
		lc.getLocalMsg( 'hide_changes_link' ) :
		lc.getLocalMsg( 'show_changes_link' )
	);
};
/**
 * @requires wgScript, wgPageName, wgContentLanguage
 */
lc.createPortlet = function () {
	var sk = mw.config.get( 'skin' ),
		$newPortlet;
	switch( sk ) {
		case 'vector':
			// Create a new portlet for this script
			$newPortlet = $( '#p-cactions' )
				.clone()
					.find( 'li' )
						.remove()
						.end()
				.attr( {
					'id': 'p-variants-js',
					'class': 'vectorMenu emptyPortlet'
				} )
				.find( 'span' )
					.text( lc.getLocalMsg( 'menu_title' ) )
					.addClass( 'flag-' + lc.lang )
					.end()
				.appendTo( '#left-navigation' );
			break;
		default:
			// Create a new portlet for this script
			$newPortlet = $( '#p-tb' )
				.clone()
					.attr( 'id', 'p-variants-js' )
					.find( 'li' )
						.remove().end()
				.find( 'h5' )
					.text( lc.getLocalMsg( 'menu_title' ) ).end()
				.insertBefore( '#p-tb' );
	}
};

/**
* @author Based on analogous function from skins/vector.php
* @requires wgScript, wgPageName, wgContentLanguage
*/
lc.render_navigation = function () {
	var	list = lc.settings.variants_list,
		show = lc.settings.show_changes,
		sk = mw.config.get( 'skin' ),
		v, isSelected,
		getClickHandler = function( v ){
			return function ( e ) {
				e.preventDefault();
				if ( v !== lc.lang ) {
					if ( lc.mustReload ) {
						location.href = mw.util.getUrl( null, { variant: v } );
					} else {
						lc.startConversion( v );
					}
				}
			};
		};

	lc.$target.toggleClass('show-changes', show);

	lc.createPortlet();
	for( v in list ){
		if ( list[v] === null ) {
			continue;
		}
		isSelected = v === lc.lang && sk === 'vector';
		$( mw.util.addPortletLink(
			'p-variants-js',
			'#',
			list[v],
			'ca-conv-' + v
		) )
		.toggleClass( 'selected', isSelected )
		.click( getClickHandler ( v ) );
		if ( isSelected ) {
			$( '#p-variants-js' ).find( 'span' ).text( list[v] );
		}
	}
	if ( lc.settings.help_page && lc.getLocalMsg( 'help_page_link' ) ) {
		mw.util.addPortletLink(
			'p-variants-js',
			mw.util.getUrl( lc.settings.help_page ),
			lc.getLocalMsg( 'help_page_link' ),
			'ca-conv-help-page'
		);
	}
	if ( lc.getLocalMsg( 'show_changes_link' ) && lc.getLocalMsg( 'hide_changes_link' ) ) {
		$( mw.util.addPortletLink(
			'p-variants-js',
			'#',
			show? lc.getLocalMsg( 'hide_changes_link' ) : lc.getLocalMsg( 'show_changes_link' ),
			'ca-conv-show-hide-changes'
		) )
		.click( function ( e ) {
			e.preventDefault();
			lc.toggle_visibility();
		} );
	}
	$('#ca-conv-show-hide-changes')
		.toggle( lc.lang !== mw.config.get( 'wgContentLanguage' ) );
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
	if ( !lc.isAllowed() ) {
		return;
	}
	document.title = lc.conv_typo_text( document.title );
	lc.conv_typo_node( lc.$target[0] );
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
	lc.conv_typo_document();

	var	query, pages, pageids,
		pagenames = lc.settings.global_dic_page[ lc.lang ],
		sortable = [],
		sk = mw.config.get( 'skin' ),
		str, lines, line, data, v,
		i, id, mm, match2, list, showChanges;
	if ( !pagenames ){
		alert( lc.getLocalMsg( 'error_missing_dict_name' ) + lc.lang );
		$.removeSpinner( 'var-spinner' );
		return false;
	}
	if( res ){
		query = res.query;
		if( query ){
			pages = query.pages;
			pageids = query.pageids;
		}
		if ( !query || !pages || !pageids ){
			$.removeSpinner( 'var-spinner' );
			return false;
		}
	} else {
		$.removeSpinner( 'var-spinner' );
		return false;
	}
	if ( typeof pagenames === 'object' ) {
		pagenames = pagenames.pages || pagenames.page;
	}
	pagenames = pagenames.split('|');

	for (i = 0; i < pageids.length; i += 1 ) {
		if( !pages[ pageids[i] ].pageid ){
			alert( lc.getLocalMsg( 'error_missing_dict' ) + pages[ pageids[i] ].title );
			location.href = mw.util.getUrl( null, { variant: mw.config.get( 'wgContentLanguage' ) } );
			continue;
		}

		sortable.push([
			pages[ pageids[i] ].revisions[0]['*'], //Wiki code of dictionary page
			pagenames.indexOf(pages[ pageids[i] ].title) //Order of page
			//,pages[ pageids[i] ].title //Title of page
		]);
	}
	if ( !sortable.length ){
		$.removeSpinner( 'var-spinner' );
		return;
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
	lc.conv_node_from_dic( lc.$target[0] );

	// Update menu links
	list = lc.settings.variants_list;
	for( v in list ){
		if ( list[v] !== null ) {
			$( '#ca-conv-' + v )
				.toggleClass( 'selected', v === lc.lang && sk === 'vector' );
		}
	}
	if ( lc.settings.show_menu_title ) {
		$( '#p-variants-js' )
			.find( 'span' )
				.text( list[lc.lang] )
				.attr( 'class', 'flag-' + lc.lang );
	}
	$('#ca-conv-show-hide-changes').toggle( lc.lang !== mw.config.get( 'wgContentLanguage' ) );
	lc.mustReload = true;
	$.removeSpinner( 'var-spinner' );
};

/**
* Gets the dictionary and do the modernization
* @param {string} l The language code
*/
lc.startConversion = function ( l ){
	var ch, re, dicts, changes, change, api, type;

	//if (undefined === l) l = lc.get_preferred_variant()
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
					change[0] = new RegExp( mw.RegExp.escape( change[0] ), 'g' );
				}
				lc.regTypoChanges.push( change );
			}
		} else if ( changes.constructor === Object ) {
			for ( ch in changes ) {
				if ( !changes.hasOwnProperty || changes[ ch ] === null ) {
					continue;
				}
				try {
					re = new RegExp( mw.RegExp.escape( ch ), 'g' );
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

	if ( l === mw.config.get( 'wgContentLanguage' ) ) {
		return false;
	}

	$( '#p-variants-js' ).injectSpinner( { id: 'var-spinner' } );

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
	lc.settings = {
		msg: {
			error_missing_dict: 'The following dictionary was not found:\n',
			error_missing_dict_name: 'It is necessary to define the page name of the dictionary for ',
			error_word_processing: 'Error has occurred while processing the following word:\n',
			error_typo_processing: 'Error has occurred while processing the following typographic change:\n',
			help_page_link: 'Open help page',
			show_changes_link: 'Show changes',
			hide_changes_link: 'Hide changes',
			menu_title: 'Variants'
		},
		/**
		* TODO: Use by default some general regex for word bondaries, as in
		* http://www.unicode.org/reports/tr29/#Default_Word_Boundaries
		*/
		word_chars: 'a-zA-Z\'-',

		/**
		* Typographic conversion (applied before dictionary conversion)
		*/
		typo_changes: {},

		/**
		* Names of each language and/or variant to which conversion is enabled
		* in the current wiki
		*/
		variants_list: {},

		/**
		* List of namespaces where conversion is enabled.
		* The exact behavior depends on {@link lc.selection_mode} and
		* the presence of an element whose id attribute is
		* the value of {@link lc.local_dic_id}
		* @see lc.selection_mode
		* @see lc.local_dic_id
		*/
		ns_list: { 0 : true },

		/**
		* Id used in template or wikitext to enable conversion to some variant
		* @see lc.ns_list
		* @see lc.selection_mode
		*/
		local_dic_id: 'modernization',

		/**
		* Class used in template or wikitext to disable conversion
		* of the content inside of an HTML element
		*/
		no_conversion_class: 'no-conversion',

		/**
		* Page of current wiki where the dictionaries for each variant should be defined
		*/
		global_dic_page: 'Project:Dictionary',

		/**
		* Help page about the conversion system, for each wiki
		*/
		help_page: 'Project:Language Converter',

		/**
		* Enables the addition of a span around each converted expression
		* (for dictionary, not typographic conversion)
		*/
		show_changes: false,

		/**
		* Enables the exibition of the text of selected item in the menu title
		*/
		show_menu_title: true,

		/**
		* Defines how to select pages where the conversion is enabled
		* @see lc.ns_list
		* @see lc.local_dic_id
		*/
		selection_mode: 'AND',

		/**
		* How many words in sequence can be converted as a "phrase"
		*/
		max_seq: 3
	};

	//Override default settings above by specific wiki configuration, if any
	$.extend(true, lc.settings, lc.config);

	if ( !lc.isAllowed() ) {
		return;
	}
	lc.secure = location.protocol === 'https:';
	lc.$target = $( '#content' );
	if( !lc.$target.length ) {
		lc.$target = $( '#mw-content-text' );
	}

	/**
	* Variant currently selected
	* Used by {@link lc.render_navigation}, {@link lc.conv_typo_text},
	* {@link lc.conv_text_from_dic}, {@link lc.conv_callback},
	* {@link lc.startConversion} and {@link mod_lookup}
	*/
	lc.lang = lc.get_preferred_variant();
	$.cookie( lc.cookie, lc.lang, {
		expires: 7, // expires in 7 days
		path: '/', // domain-wide, entire wiki
		secure: lc.secure
	} );
	lc.render_navigation();
	lc.startConversion( lc.lang );
};

$.when(
	mw.loader.using( [ 'mediawiki.util', 'jquery.cookie', 'jquery.spinner', 'mediawiki.RegExp' ] ),
	$.ready
).then( function () {
	lc.load();
	// See also [[s:fr:MediaWiki:Gadget-mod.js]] and [[Wikisource:Scriptorium/Août_2009#typographie]]
	if (self.gadget_typographie && !self.gadget_mod2) {
		lc.conv_typo_document();
	}
});


}( mediaWiki, jQuery, window.LanguageConverter ) );
