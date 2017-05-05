/******************************************************************************
 * Copyright © 2013-2016 The KPL Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * KPL software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 */
var krs = (function(krs, $) {
	var _tagsPerPage = 34;
	var _currentSearch = {
		"page": "",
		"searchStr": ""
	};

    krs.jsondata.data = function(response) {
        return {
            nameFormatted: krs.getTransactionLink(response.transaction, krs.addEllipsis(response.name, 20)),
            accountFormatted: krs.getAccountLink(response, "account"),
            type: krs.addEllipsis(String(response.type).escapeHTML(), 20),
            channel: krs.addEllipsis(String(response.channel).escapeHTML(), 20),
            filename: krs.addEllipsis(String(response.filename).escapeHTML(), 20),
            dataFormatted: krs.getTaggedDataLink(response.transaction, response.isText)
        };
    };

    krs.getTaggedDataLink = function(transaction, isText) {
        if (isText) {
            return "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' " +
                "data-target='#tagged_data_view_modal' " +
                "data-transaction='" + String(transaction).escapeHTML() + "'>" + $.t("view") + "</a>";
        } else {
			return "<a href='/kpl?requestType=downloadTaggedData&transaction=" + String(transaction).escapeHTML() +
                "&retrieve=true' class='btn btn-xs btn-default'>" + $.t("download") + "</a>";
        }
    };

	krs.tagged_data_show_results = function(response) {
		$("#tagged_data_search_contents").empty();
		$("#tagged_data_search_results").show();
		$("#tagged_data_search_center").hide();
		$("#tagged_data_reset").show();

        krs.hasMorePages = false;
        var view = krs.simpleview.get('tagged_data_search_results_section', {
            errorMessage: null,
            isLoading: true,
            isEmpty: false,
            data: []
        });
        if (response.data.length > krs.itemsPerPage) {
            krs.hasMorePages = true;
            response.data.pop();
        }
        view.data.length = 0;
        response.data.forEach(
            function (dataJson) {
                view.data.push( krs.jsondata.data(dataJson) );
            }
        );
        view.render({
            isLoading: false,
            isEmpty: view.data.length == 0
        });
        krs.pageLoaded();
    };

	krs.tagged_data_load_tags = function() {
		$('#tagged_data_tag_list').empty();
		krs.sendRequest("getDataTags+", {
			"firstIndex": krs.pageNumber * _tagsPerPage - _tagsPerPage,
			"lastIndex": krs.pageNumber * _tagsPerPage
		}, function(response) {
			var content = "";
			if (response.tags && response.tags.length) {
				krs.hasMorePages = response.tags.length > _tagsPerPage;
				for (var i=0; i<response.tags.length; i++) {
					content += '<div style="padding:5px 24px 5px 24px;text-align:center;background-color:#fff;font-size:16px;';
					content += 'width:220px;display:inline-block;margin:2px;border:1px solid #f2f2f2;">';
					content += '<a href="#" onclick="event.preventDefault(); krs.tagged_data_search_tag(\'' +response.tags[i].tag + '\');">';
					content += response.tags[i].tag.escapeHTML() + ' [' + response.tags[i].count + ']</a>';
					content += '</div>';
				}
			}
			$('#tagged_data_tag_list').html(content);
			krs.pageLoaded();
		});
	};

	krs.tagged_data_search_account = function(account) {
		if (account == null) {
			account = _currentSearch["searchStr"];
		} else {
			_currentSearch = {
				"page": "account",
				"searchStr": account
			};
			krs.pageNumber = 1;
			krs.hasMorePages = false;
		}
		$(".tagged_data_search_pageheader_addon").hide();
		$(".tagged_data_search_pageheader_addon_account_text").text(account);
		$(".tagged_data_search_pageheader_addon_account").show();
		krs.sendRequest("getAccountTaggedData+", {
			"account": account,
			"firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
			"lastIndex": krs.pageNumber * krs.itemsPerPage
		}, function(response) {
			krs.tagged_data_show_results(response);
		});
	};

	krs.tagged_data_search_fulltext = function(query) {
		if (query == null) {
			query = _currentSearch["searchStr"];
		} else {
			_currentSearch = {
				"page": "fulltext",
				"searchStr": query
			};
			krs.pageNumber = 1;
			krs.hasMorePages = false;
		}
		$(".tagged_data_search_pageheader_addon").hide();
		$(".tagged_data_search_pageheader_addon_fulltext_text").text('"' + query + '"');
		$(".tagged_data_search_pageheader_addon_fulltext").show();
		krs.sendRequest("searchTaggedData+", {
			"query": query,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
			"lastIndex": krs.pageNumber * krs.itemsPerPage
		}, function(response) {
			krs.tagged_data_show_results(response);
		});
	};

	krs.tagged_data_search_tag = function(tag) {
		if (tag == null) {
			tag = _currentSearch["searchStr"];
		} else {
			_currentSearch = {
				"page": "tag",
				"searchStr": tag
			};
			krs.pageNumber = 1;
			krs.hasMorePages = false;
		}
		$(".tagged_data_search_pageheader_addon").hide();
		$(".tagged_data_search_pageheader_addon_tag_text").text('"' + tag + '"');
		$(".tagged_data_search_pageheader_addon_tag").show();
		krs.sendRequest("searchTaggedData+", {
			"tag": tag,
			"firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
			"lastIndex": krs.pageNumber * krs.itemsPerPage
		}, function(response) {
			krs.tagged_data_show_results(response);
		});
	};

	krs.tagged_data_search_main = function(callback) {
		if (_currentSearch["page"] != "main") {
			krs.pageNumber = 1;
			krs.hasMorePages = false;
		}
		_currentSearch = {
			"page": "main",
			"searchStr": ""
		};
		$(".tagged_data_search input[name=q]").val("").trigger("unmask").mask("KPL-****-****-****-*****");
		$(".tagged_data_fulltext_search input[name=fs_q]").val("");
		$(".tagged_data_search_pageheader_addon").hide();
		$("#tagged_data_search_contents").empty();
		krs.tagged_data_load_tags();

		$("#tagged_data_search_center").show();
		$("#tagged_data_reset").hide();
		$("#tagged_data_search_results").hide();
        krs.sendRequest("getAllTaggedData+", {
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            krs.tagged_data_show_results(response);
        });

		if (callback) {
			callback();
		}
	};

	krs.pages.tagged_data_search = function(callback) {
		$("#tagged_data_top").show();
		$("#tagged_data_search_center").show();
		if (_currentSearch["page"] == "account") {
			krs.tagged_data_search_account();
		} else if (_currentSearch["page"] == "fulltext") {
			krs.tagged_data_search_fulltext();
		} else if (_currentSearch["page"] == "tag") {
			krs.tagged_data_search_tag();
		} else {
			krs.tagged_data_search_main(callback);
		}
	};

	krs.setup.tagged_data_search = function() {
		var sidebarId = 'sidebar_tagged_data';
		var options = {
			"id": sidebarId,
			"titleHTML": '<i class="fa fa-database"></i><span data-i18n="data_cloud">Data Cloud</span>',
			"page": 'tagged_data_search',
			"desiredPosition": 60,
			"depends": { tags: [ krs.constants.API_TAGS.DATA ] }
		};
		krs.addTreeviewSidebarMenuItem(options);
		options = {
			"titleHTML": '<span data-i18n="search">Search</span></a>',
			"type": 'PAGE',
			"page": 'tagged_data_search'
		};
		krs.appendMenuItemToTSMenuItem(sidebarId, options);
		options = {
			"titleHTML": '<span data-i18n="upload_file">File Upload</span></a>',
			"type": 'MODAL',
			"modalId": 'upload_data_modal'
		};
		krs.appendMenuItemToTSMenuItem(sidebarId, options);
	};

	$(".tagged_data_search").on("submit", function(e) {
		e.preventDefault();
		var account = $.trim($(this).find("input[name=q]").val());
		$(".tagged_data_search input[name=q]").val(account);

		if (account == "") {
			krs.pages.tagged_data_search();
		} else if (/^(KPL\-)/i.test(account)) {
			var address = new KplAddress();
			if (!address.set(account)) {
				$.growl($.t("error_invalid_account"), {
					"type": "danger"
				});
			} else {
				krs.tagged_data_search_account(account);
			}
		} else {
            krs.tagged_data_search_account(account);
		}
	});

	$(".tagged_data_fulltext_search").on("submit", function(e) {
		e.preventDefault();
		var query = $.trim($(this).find("input[name=fs_q]").val());
		if (query != "") {
			krs.tagged_data_search_fulltext(query);
		}
	});

	$("#tagged_data_reset").on("click", function(e) {
		e.preventDefault();
		krs.tagged_data_search_main();
	});

	$("#tagged_data_upload").on("click", function(e) {
		e.preventDefault();
        $('#upload_data_modal').modal("show");
	});

    $("#tagged_data_view_modal").on("show.bs.modal", function(e) {
        var $invoker = $(e.relatedTarget);
        var transaction = $invoker.data("transaction");
        krs.sendRequest("getTaggedData", {
			"transaction": transaction,
			"retrieve": "true"
		}, function (response) {
			if (response.errorCode) {
                $("#tagged_data_content").val(response.errorDescription.escapeHTML());
			} else {
                $("#tagged_data_content").val(response.data);
			}
		}, false);
		$("#tagged_data_download").attr("href", "/kpl?requestType=downloadTaggedData&transaction=" + transaction + "&retrieve=true");
    });

    $("#extend_data_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var transaction = $invoker.data("transaction");
        $("#extend_data_transaction").val(transaction);
        krs.sendRequest("getTransaction", {
            "transaction": transaction
        }, function (response) {
            var fee = krs.convertToKPL(String(response.feeNQT).escapeHTML());
            $('#extend_data_fee').val(fee);
            $('#extend_data_fee_label').html(String(fee) + " KPL");
        })
    });

	return krs;
}(krs || {}, jQuery));