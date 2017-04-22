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
 * @depends {3rdparty/jquery-2.1.0.js}
 * @depends {3rdparty/bootstrap.js}
 * @depends {3rdparty/big.js}
 * @depends {3rdparty/jsbn.js}
 * @depends {3rdparty/jsbn2.js}
 * @depends {3rdparty/pako.js}
 * @depends {3rdparty/webdb.js}
 * @depends {3rdparty/growl.js}
 * @depends {crypto/curve25519.js}
 * @depends {crypto/curve25519_.js}
 * @depends {crypto/passphrasegenerator.js}
 * @depends {crypto/sha256worker.js}
 * @depends {crypto/3rdparty/cryptojs/aes.js}
 * @depends {crypto/3rdparty/cryptojs/sha256.js}
 * @depends {crypto/3rdparty/jssha256.js}
 * @depends {util/converters.js}
 * @depends {util/extensions.js}
 * @depends {util/KPLaddress.js}
 */
var krs = (function(krs, $, undefined) {
	"use strict";

	krs.server = "";
	krs.state = {};
	krs.blocks = [];
	krs.account = "";
	krs.accountRS = "";
	krs.publicKey = "";
	krs.accountInfo = {};

	krs.database = null;
	krs.databaseSupport = false;
	krs.databaseFirstStart = false;

	// Legacy database, don't use this for data storage
	krs.legacyDatabase = null;
	krs.legacyDatabaseWithData = false;

	krs.serverConnect = false;
	krs.peerConnect = false;

	krs.settings = {};
	krs.contacts = {};

	krs.isTestNet = false;
	krs.isLocalHost = false;
	krs.forgingStatus = krs.constants.UNKNOWN;
	krs.isAccountForging = false;
	krs.isLeased = false;
	krs.needsAdminPassword = true;
    krs.upnpExternalAddress = null;
	krs.ledgerTrimKeep = 0;

	krs.lastBlockHeight = 0;
	krs.downloadingBlockchain = false;

	krs.rememberPassword = false;
	krs.selectedContext = null;

	krs.currentPage = "dashboard";
	krs.currentSubPage = "";
	krs.pageNumber = 1;
	//krs.itemsPerPage = 50;  /* Now set in krs.settings.js */

	krs.pages = {};
	krs.incoming = {};
	krs.setup = {};

	krs.appVersion = "";
	krs.appPlatform = "";
	krs.assetTableKeys = [];

	var stateInterval;
	var stateIntervalSeconds = 30;
	var isScanning = false;

    krs.init = function() {
        var set_lang = '';
        krs.sendRequest("appLanguage", {}, function(response) {
            switch(response["language"].toUpperCase()){
                case "ZH":
                case "ZH-CN":
                case "CN":
                    set_lang = "zh-cn";
                    window.language = "zh-cn";
                    break;
                default:
                    set_lang = "en";
                    window.language = "en";
            }
            krs.updateSettings("language",set_lang);
        });
		krs.sendRequest("getState", {
			"includeCounts": "false"
		}, function (response) {
			var isTestnet = false;
			var isOffline = false;
			var peerPort = 0;
			for (var key in response) {
                if (!response.hasOwnProperty(key)) {
                    continue;
                }
				if (key == "isTestnet") {
					isTestnet = response[key];
				}
				if (key == "isOffline") {
					isOffline = response[key];
				}
				if (key == "peerPort") {
					peerPort = response[key];
				}
				if (key == "needsAdminPassword") {
					krs.needsAdminPassword = response[key];
				}
				if (key == "upnpExternalAddress") {
                    krs.upnpExternalAddress = response[key];
				}
			}

			if (!isTestnet) {
				$(".testnet_only").hide();
			} else {
				krs.isTestNet = true;
				var testnetWarningDiv = $("#testnet_warning");
				var warningText = testnetWarningDiv.text() + " The testnet peer port is " + peerPort + (isOffline ? ", the peer is working offline." : ".");
                krs.logConsole(warningText);
				testnetWarningDiv.text(warningText);
				$(".testnet_only, #testnet_login, #testnet_warning").show();
			}
			krs.loadServerConstants();
			krs.initializePlugins();
            krs.printEnvInfo();
		});

		if (!krs.server) {
			var hostName = window.location.hostname.toLowerCase();
			krs.isLocalHost = hostName == "localhost" || hostName == "127.0.0.1" || krs.isPrivateIP(hostName);
            krs.logProperty("krs.isLocalHost");
		}

		if (!krs.isLocalHost) {
			$(".remote_warning").show();
		}
		var hasLocalStorage = false;
		try {
			//noinspection BadExpressionStatementJS
            window.localStorage && localStorage;
			hasLocalStorage = checkLocalStorage();
		} catch (err) {
			krs.logConsole("localStorage is disabled, error " + err.message);
			hasLocalStorage = false;
		}

		if (!hasLocalStorage) {
			krs.logConsole("localStorage is disabled, cannot load wallet");
			// TODO add visible warning
			return; // do not load client if local storage is disabled
		}

		if(!(navigator.userAgent.indexOf('Safari') != -1 &&
			navigator.userAgent.indexOf('Chrome') == -1) &&
			navigator.userAgent.indexOf('JavaFX') == -1) {
			// Don't use account based DB in Safari due to a buggy indexedDB implementation (2015-02-24)
			krs.createLegacyDatabase();
		}

		if (krs.getStrItem("remember_passphrase")) {
			$("#remember_password").prop("checked", true);
		}
		krs.getSettings(false);

		krs.getState(function() {
			setTimeout(function() {
				krs.checkAliasVersions();
			}, 5000);
		});

		$("body").popover({
			"selector": ".show_popover",
			"html": true,
			"trigger": "hover"
		});

		krs.showLockscreen();
		krs.setStateInterval(30);

		setInterval(krs.checkAliasVersions, 1000 * 60 * 60);

		krs.allowLoginViaEnter();
		krs.automaticallyCheckRecipient();

		$("#dashboard_table, #transactions_table").on("mouseenter", "td.confirmations", function() {
			$(this).popover("show");
		}).on("mouseleave", "td.confirmations", function() {
			$(this).popover("destroy");
			$(".popover").remove();
		});

		_fix();

		$(window).on("resize", function() {
			_fix();

			if (krs.currentPage == "asset_exchange") {
				krs.positionAssetSidebar();
			}
		});
		// Enable all static tooltip components
		// tooltip components generated dynamically (for tables cells for example)
		// has to be enabled by activating this code on the specific widget
		$("[data-toggle='tooltip']").tooltip();

		$("#dgs_search_account_center").mask("KPL-****-****-****-*****");

		if (krs.getUrlParameter("account")){
			krs.login(false,krs.getUrlParameter("account"));
		}
	};

	function _fix() {
		var height = $(window).height() - $("body > .header").height();
		var content = $(".wrapper").height();

		$(".content.content-stretch:visible").width($(".page:visible").width());
		if (content > height) {
			$(".left-side, html, body").css("min-height", content + "px");
		} else {
			$(".left-side, html, body").css("min-height", height + "px");
		}
	}

	krs.setStateInterval = function(seconds) {
		if (!krs.isPollGetState()) {
			return;
		}
		if (seconds == stateIntervalSeconds && stateInterval) {
			return;
		}
		if (stateInterval) {
			clearInterval(stateInterval);
		}
		stateIntervalSeconds = seconds;
		stateInterval = setInterval(function() {
			krs.getState(null);
			krs.updateForgingStatus();
		}, 1000 * seconds);
	};

	var _firstTimeAfterLoginRun = false;

	krs.getState = function(callback, msg) {
		if (msg) {
			krs.logConsole("getState event " + msg);
		}
		krs.sendRequest("getBlockchainStatus", {}, function(response) {
			if (response.errorCode) {
				krs.serverConnect = false;
                $.growl($.t("server_connection_error") + " " + response.errorDescription.escapeHTML());
			} else {
				var firstTime = !("lastBlock" in krs.state);
				var previousLastBlock = (firstTime ? "0" : krs.state.lastBlock);

				krs.state = response;
				krs.serverConnect = true;
				krs.ledgerTrimKeep = response.ledgerTrimKeep;
				$("#sidebar_block_link").html(krs.getBlockLink(krs.state.numberOfBlocks - 1));
				if (firstTime) {
					$("#krs_version").html(krs.state.version).removeClass("loading_dots");
					krs.getBlock(krs.state.lastBlock, krs.handleInitialBlocks);
				} else if (krs.state.isScanning) {
					//do nothing but reset krs.state so that when isScanning is done, everything is reset.
					isScanning = true;
				} else if (isScanning) {
					//rescan is done, now we must reset everything...
					isScanning = false;
					krs.blocks = [];
					krs.tempBlocks = [];
					krs.getBlock(krs.state.lastBlock, krs.handleInitialBlocks);
					if (krs.account) {
						krs.getInitialTransactions();
						krs.getAccountInfo();
					}
				} else if (previousLastBlock != krs.state.lastBlock) {
					krs.tempBlocks = [];
					if (krs.account) {
						krs.getAccountInfo();
					}
					krs.getBlock(krs.state.lastBlock, krs.handleNewBlocks);
					if (krs.account) {
						krs.getNewTransactions();
						krs.updateApprovalRequests();
					}
				} else {
					if (krs.account) {
						krs.getUnconfirmedTransactions(function(unconfirmedTransactions) {
							krs.handleIncomingTransactions(unconfirmedTransactions, false);
						});
					}
				}
				if (krs.account && !_firstTimeAfterLoginRun) {
					//Executed ~30 secs after login, can be used for tasks needing this condition state
					_firstTimeAfterLoginRun = true;
				}

				if (callback) {
					callback();
				}
			}
			/* Checks if the client is connected to active peers */
			krs.checkConnected();
			//only done so that download progress meter updates correctly based on lastFeederHeight
			if (krs.downloadingBlockchain) {
				krs.updateBlockchainDownloadProgress();
			}
		});
	};

	$("#logo, .sidebar-menu").on("click", "a", function(e, data) {
		if ($(this).hasClass("ignore")) {
			$(this).removeClass("ignore");
			return;
		}

		e.preventDefault();

		if ($(this).data("toggle") == "modal") {
			return;
		}

		var page = $(this).data("page");

		if (page == krs.currentPage) {
			if (data && data.callback) {
				data.callback();
			}
			return;
		}

		$(".page").hide();

		$(document.documentElement).scrollTop(0);

		$("#" + page + "_page").show();

		$(".content-header h1").find(".loading_dots").remove();

        var $newActiveA;
        if ($(this).attr("id") && $(this).attr("id") == "logo") {
            $newActiveA = $("#dashboard_link").find("a");
		} else {
			$newActiveA = $(this);
		}
		var $newActivePageLi = $newActiveA.closest("li.treeview");

		$("ul.sidebar-menu > li.active").each(function(key, elem) {
			if ($newActivePageLi.attr("id") != $(elem).attr("id")) {
				$(elem).children("a").first().addClass("ignore").click();
			}
		});

		$("ul.sidebar-menu > li.sm_simple").removeClass("active");
		if ($newActiveA.parent("li").hasClass("sm_simple")) {
			$newActiveA.parent("li").addClass("active");
		}

		$("ul.sidebar-menu li.sm_treeview_submenu").removeClass("active");
		if($(this).parent("li").hasClass("sm_treeview_submenu")) {
			$(this).closest("li").addClass("active");
		}

		if (krs.currentPage != "messages") {
			$("#inline_message_password").val("");
		}

		//krs.previousPage = krs.currentPage;
		krs.currentPage = page;
		krs.currentSubPage = "";
		krs.pageNumber = 1;
		krs.showPageNumbers = false;

		if (krs.pages[page]) {
			krs.pageLoading();
			krs.resetNotificationState(page);
            var callback;
            if (data) {
				if (data.callback) {
					callback = data.callback;
				} else {
					callback = data;
				}
			} else {
				callback = undefined;
			}
            var subpage;
            if (data && data.subpage) {
                subpage = data.subpage;
			} else {
				subpage = undefined;
			}
			krs.pages[page](callback, subpage);
		}
	});

	$("button.goto-page, a.goto-page").click(function(event) {
		event.preventDefault();
		krs.goToPage($(this).data("page"), undefined, $(this).data("subpage"));
	});

	krs.loadPage = function(page, callback, subpage) {
		krs.pageLoading();
		krs.pages[page](callback, subpage);
	};

	krs.languageAuto = function(){
        var type = navigator.appName;
        var lang = type=="Netscape"?navigator.language:navigator.userLanguage;
        lang = lang.escapeHTML();//lang.substr(0,5);
        var set_lang = '';
        if(!lang){
            krs.sendRequest("appLanguage", {}, function(data) {
                var _data = data;
                switch(_data["language"].toUpperCase()){
                    case "ZH":
                    case "ZH-CN":
                    case "CN":
                        set_lang = "zh-cn";
                        break;
                    default:
                        set_lang = "en";
                }
                krs.updateSettings("language",set_lang);
            });
        }else{
            if(lang.toUpperCase() === "ZH-CN") {
                set_lang = "zh-cn";
            }else{
                set_lang = "en";
            }
            krs.updateSettings("language",set_lang);
        }
	}

	krs.goToPage = function(page, callback, subpage) {
		var $link = $("ul.sidebar-menu a[data-page=" + page + "]");

		if ($link.length > 1) {
			if ($link.last().is(":visible")) {
				$link = $link.last();
			} else {
				$link = $link.first();
			}
		}

		if ($link.length == 1) {
			$link.trigger("click", [{
				"callback": callback,
				"subpage": subpage
			}]);
			krs.resetNotificationState(page);
		} else {
			krs.currentPage = page;
			krs.currentSubPage = "";
			krs.pageNumber = 1;
			krs.showPageNumbers = false;

			$("ul.sidebar-menu a.active").removeClass("active");
			$(".page").hide();
			$("#" + page + "_page").show();
			if (krs.pages[page]) {
				krs.pageLoading();
				krs.resetNotificationState(page);
				krs.pages[page](callback, subpage);
			}
		}
	};

	krs.pageLoading = function() {
		krs.hasMorePages = false;

		var $pageHeader = $("#" + krs.currentPage + "_page .content-header h1");
		$pageHeader.find(".loading_dots").remove();
		$pageHeader.append("<span class='loading_dots'><span>.</span><span>.</span><span>.</span></span>");
	};

	krs.pageLoaded = function(callback) {
		var $currentPage = $("#" + krs.currentPage + "_page");

		$currentPage.find(".content-header h1 .loading_dots").remove();

		if ($currentPage.hasClass("paginated")) {
			krs.addPagination();
		}

		if (callback) {
			try {
                callback();
            } catch(e) { /* ignore since sometimes callback is not a function */ }
		}
	};

krs.addPagination = function () {
        var firstStartNr = 1;
		var firstEndNr = krs.itemsPerPage;
		var currentStartNr = (krs.pageNumber-1) * krs.itemsPerPage + 1;
		var currentEndNr = krs.pageNumber * krs.itemsPerPage;

		var prevHTML = '<span style="display:inline-block;width:48px;text-align:right;">';
		var firstHTML = '<span style="display:inline-block;min-width:48px;text-align:right;vertical-align:top;margin-top:4px;">';
		var currentHTML = '<span style="display:inline-block;min-width:48px;text-align:left;vertical-align:top;margin-top:4px;">';
		var nextHTML = '<span style="display:inline-block;width:48px;text-align:left;">';

		if (krs.pageNumber > 1) {
			prevHTML += "<a href='#' data-page='" + (krs.pageNumber - 1) + "' title='" + $.t("previous") + "' style='font-size:20px;'>";
			prevHTML += "<i class='fa fa-arrow-circle-left'></i></a>";
		} else {
			prevHTML += '&nbsp;';
		}

		if (krs.hasMorePages) {
			currentHTML += currentStartNr + "-" + currentEndNr + "&nbsp;";
			nextHTML += "<a href='#' data-page='" + (krs.pageNumber + 1) + "' title='" + $.t("next") + "' style='font-size:20px;'>";
			nextHTML += "<i class='fa fa-arrow-circle-right'></i></a>";
		} else {
			if (krs.pageNumber > 1) {
				currentHTML += currentStartNr + "+";
			} else {
				currentHTML += "&nbsp;";
			}
			nextHTML += "&nbsp;";
		}
		if (krs.pageNumber > 1) {
			firstHTML += "&nbsp;<a href='#' data-page='1'>" + firstStartNr + "-" + firstEndNr + "</a>&nbsp;|&nbsp;";
		} else {
			firstHTML += "&nbsp;";
		}

		prevHTML += '</span>';
		firstHTML += '</span>';
		currentHTML += '</span>';
		nextHTML += '</span>';

		var output = prevHTML + firstHTML + currentHTML + nextHTML;
		var $paginationContainer = $("#" + krs.currentPage + "_page .data-pagination");

		if ($paginationContainer.length) {
			$paginationContainer.html(output);
		}
	};

	$(document).on("click", ".data-pagination a", function(e) {
		e.preventDefault();

		krs.goToPageNumber($(this).data("page"));
	});

	krs.goToPageNumber = function(pageNumber) {
		/*if (!pageLoaded) {
			return;
		}*/
		krs.pageNumber = pageNumber;

		krs.pageLoading();

		krs.pages[krs.currentPage]();
	};

	function initUserDB() {
		krs.storageSelect("data", [{
			"id": "asset_exchange_version"
		}], function(error, result) {
			if (!result || !result.length) {
				krs.storageDelete("assets", [], function(error) {
					if (!error) {
						krs.storageInsert("data", "id", {
							"id": "asset_exchange_version",
							"contents": 2
						});
					}
				});
			}
		});

		krs.storageSelect("data", [{
			"id": "closed_groups"
		}], function(error, result) {
			if (result && result.length) {
				krs.setClosedGroups(result[0].contents.split("#"));
			} else {
				krs.storageInsert("data", "id", {
					id: "closed_groups",
					contents: ""
				});
			}
		});
		krs.loadContacts();
		krs.getSettings(true);
		krs.updateNotifications();
		krs.setUnconfirmedNotifications();
		krs.setPhasingNotifications();
		var page = krs.getUrlParameter("page");
		if (page) {
			page = page.escapeHTML();
			if (krs.pages[page]) {
				krs.goToPage(page);
			} else {
				$.growl($.t("page") + " " + page + " " + $.t("does_not_exist"), {
					"type": "danger",
					"offset": 50
				});
			}
		}
		if (krs.getUrlParameter("modal")) {
			var urlParams = [];
			if (window.location.search && window.location.search.length > 1) {
				urlParams = window.location.search.substring(1).split('&');
			}
			var modalId = "#" + krs.getUrlParameter("modal").escapeHTML();
			var modal = $(modalId);
			var attributes = {};
			if (modal[0]) {
				var isValidParams = true;
				for (var i = 0; i < urlParams.length; i++) {
					var paramKeyValue = urlParams[i].split('=');
					if (paramKeyValue.length != 2) {
						continue;
					}
					var key = paramKeyValue[0].escapeHTML();
					if (key == "account" || key == "modal") {
						continue;
					}
					var value = paramKeyValue[1].escapeHTML();
                    var input = modal.find("input[name=" + key + "]");
                    if (input[0]) {
						if (input.attr("type") == "text") {
							input.val(value);
						} else if (input.attr("type") == "checkbox") {
							var isChecked = false;
							if (value != "true" && value != "false") {
								isValidParams = false;
								$.growl($.t("value") + " " + value + " " + $.t("must_be_true_or_false") + " " + $.t("for") + " " + key, {
									"type": "danger",
									"offset": 50
								});
							} else if (value == "true") {
								isChecked = true;
							}
							if (isValidParams) {
								input.prop('checked', isChecked);
							}
						}
					} else if (modal.find("textarea[name=" + key + "]")[0]) {
						modal.find("textarea[name=" + key + "]").val(decodeURI(value));
					} else {
						attributes["data-" + key.toLowerCase().escapeHTML()] = String(value).escapeHTML();
					}
				}
				if (isValidParams) {
					var a = $('<a />');
					a.addClass('show_transaction_modal_action');
					a.attr('href', '#');
					a.attr('data-toggle', 'modal');
					a.attr('data-target', modalId);
					Object.keys(attributes).forEach(function (key) {
						a.attr(key, attributes[key]);
					});
					$('body').append(a);
					a.click();
				}
			} else {
				$.growl($.t("modal") + " " + modalId + " " + $.t("does_not_exist"), {
					"type": "danger",
					"offset": 50
				});
			}
		}
	}

	krs.initUserDBSuccess = function() {
		krs.databaseSupport = true;
		initUserDB();
        krs.logConsole("IndexedDB initialized");
    };

	krs.initUserDBWithLegacyData = function() {
		var legacyTables = ["contacts", "assets", "data"];
		$.each(legacyTables, function(key, table) {
			krs.legacyDatabase.select(table, null, function(error, results) {
				if (!error && results && results.length >= 0) {
					krs.database.insert(table, results, function(error, inserts) {});
				}
			});
		});
		setTimeout(function(){ krs.initUserDBSuccess(); }, 1000);
	};

	krs.initLocalStorage = function() {
		krs.database = null;
		krs.databaseSupport = false;
		initUserDB();
        krs.logConsole("local storage initialized");
    };

	krs.createLegacyDatabase = function() {
		var schema = {};
		var versionLegacyDB = 2;

		// Legacy DB before switching to account based DBs, leave schema as is
		schema["contacts"] = {
			id: {
				"primary": true,
				"autoincrement": true,
				"type": "NUMBER"
			},
			name: "VARCHAR(100) COLLATE NOCASE",
			email: "VARCHAR(200)",
			account: "VARCHAR(25)",
			accountRS: "VARCHAR(25)",
			description: "TEXT"
		};
		schema["assets"] = {
			account: "VARCHAR(25)",
			accountRS: "VARCHAR(25)",
			asset: {
				"primary": true,
				"type": "VARCHAR(25)"
			},
			description: "TEXT",
			name: "VARCHAR(10)",
			decimals: "NUMBER",
			quantityQNT: "VARCHAR(15)",
			groupName: "VARCHAR(30) COLLATE NOCASE"
		};
		schema["data"] = {
			id: {
				"primary": true,
				"type": "VARCHAR(40)"
			},
			contents: "TEXT"
		};
		if (versionLegacyDB == krs.constants.DB_VERSION) {
			try {
				krs.legacyDatabase = new WebDB("krs_USER_DB", schema, versionLegacyDB, 4, function(error) {
					if (!error) {
						krs.legacyDatabase.select("data", [{
							"id": "settings"
						}], function(error, result) {
							if (result && result.length > 0) {
								krs.legacyDatabaseWithData = true;
							}
						});
					}
				});
			} catch (err) {
                krs.logConsole("error creating database " + err.message);
			}
		}
	};

	function createSchema(){
		var schema = {};

		schema["contacts"] = {
			id: {
				"primary": true,
				"autoincrement": true,
				"type": "NUMBER"
			},
			name: "VARCHAR(100) COLLATE NOCASE",
			email: "VARCHAR(200)",
			account: "VARCHAR(25)",
			accountRS: "VARCHAR(25)",
			description: "TEXT"
		};
		schema["assets"] = {
			account: "VARCHAR(25)",
			accountRS: "VARCHAR(25)",
			asset: {
				"primary": true,
				"type": "VARCHAR(25)"
			},
			description: "TEXT",
			name: "VARCHAR(10)",
			decimals: "NUMBER",
			quantityQNT: "VARCHAR(15)",
			groupName: "VARCHAR(30) COLLATE NOCASE"
		};
		schema["polls"] = {
			account: "VARCHAR(25)",
			accountRS: "VARCHAR(25)",
			name: "VARCHAR(100)",
			description: "TEXT",
			poll: "VARCHAR(25)",
			finishHeight: "VARCHAR(25)"
		};
		schema["data"] = {
			id: {
				"primary": true,
				"type": "VARCHAR(40)"
			},
			contents: "TEXT"
		};
		return schema;
	}

	function initUserDb(){
		krs.logConsole("Database is open");
		krs.database.select("data", [{
			"id": "settings"
		}], function(error, result) {
			if (result && result.length > 0) {
				krs.logConsole("Settings already exist");
				krs.databaseFirstStart = false;
				krs.initUserDBSuccess();
			} else {
				krs.logConsole("Settings not found");
				krs.databaseFirstStart = true;
				if (krs.legacyDatabaseWithData) {
					krs.initUserDBWithLegacyData();
				} else {
					krs.initUserDBSuccess();
				}
			}
		});
	}

	krs.createDatabase = function (dbName) {
		if (!krs.isIndexedDBSupported()) {
			krs.logConsole("IndexedDB not supported by the rendering engine, using localStorage instead");
			krs.initLocalStorage();
			return;
		}
		var schema = createSchema();
		krs.assetTableKeys = ["account", "accountRS", "asset", "description", "name", "position", "decimals", "quantityQNT", "groupName"];
		krs.pollsTableKeys = ["account", "accountRS", "poll", "description", "name", "finishHeight"];
		try {
			krs.logConsole("Opening database " + dbName);
            krs.database = new WebDB(dbName, schema, krs.constants.DB_VERSION, 4, function(error, db) {
                if (!error) {
                    krs.indexedDB = db;
                    initUserDb();
                } else {
                    krs.logConsole("Error opening database " + error);
                    krs.initLocalStorage();
                }
            });
            krs.logConsole("Opening database " + krs.database);
		} catch (e) {
			krs.logConsole("Exception opening database " + e.message);
			krs.initLocalStorage();
		}
	};

	/* Display connected state in Sidebar */
	krs.checkConnected = function() {
		krs.sendRequest("getPeers+", {
			"state": "CONNECTED"
		}, function(response) {
            var connectedIndicator = $("#connected_indicator");
            if (response.peers && response.peers.length) {
				krs.peerConnect = true;
				connectedIndicator.addClass("connected");
                connectedIndicator.find("span").html($.t("Connected")).attr("data-i18n", "connected");
				connectedIndicator.show();
			} else {
				krs.peerConnect = false;
				connectedIndicator.removeClass("connected");
                connectedIndicator.find("span").html($.t("Not Connected")).attr("data-i18n", "not_connected");
				connectedIndicator.show();
			}
		});
	};

	krs.getAccountInfo = function(firstRun, callback, isAccountSwitch) {
		krs.sendRequest("getAccount", {
			"account": krs.account,
			"includeAssets": true,
			"includeCurrencies": true,
			"includeLessors": true,
			"includeEffectiveBalance": true
		}, function(response) {
			var previousAccountInfo = krs.accountInfo;

			krs.accountInfo = response;

			if (response.errorCode) {
				$("#account_balance, #account_balance_sidebar, #account_nr_assets, #account_assets_balance, #account_currencies_balance, #account_nr_currencies, #account_purchase_count, #account_pending_sale_count, #account_completed_sale_count, #account_message_count, #account_alias_count").html("0");

				if (krs.accountInfo.errorCode == 5) {
					if (krs.downloadingBlockchain) {
						if (krs.newlyCreatedAccount) {
                            $("#dashboard_message").addClass("alert-success").removeClass("alert-danger").html($.t("status_new_account", {
                                "account_id": String(krs.accountRS).escapeHTML(),
                                "public_key": String(krs.publicKey).escapeHTML()
                            }) + "<br/><br/>" + $.t("status_blockchain_downloading") +
                            "<br/>" + krs.getFundAccountLink()).show();
						} else {
							$("#dashboard_message").addClass("alert-success").removeClass("alert-danger").html($.t("status_blockchain_downloading")).show();
						}
					} else if (krs.state && krs.state.isScanning) {
						$("#dashboard_message").addClass("alert-danger").removeClass("alert-success").html($.t("status_blockchain_rescanning")).show();
					} else {
                        if (krs.publicKey == "") {
                            $("#dashboard_message").addClass("alert-success").removeClass("alert-danger").html($.t("status_new_account_no_pk_v2", {
                                "account_id": String(krs.accountRS).escapeHTML()
                            })).show();
                        } else {
                            $("#dashboard_message").addClass("alert-success").removeClass("alert-danger").html($.t("status_new_account", {
                                "account_id": String(krs.accountRS).escapeHTML(),
                                "public_key": String(krs.publicKey).escapeHTML()
                            }) + "<br/>" + krs.getFundAccountLink()).show();
                        }
					}
				} else {
					$("#dashboard_message").addClass("alert-danger").removeClass("alert-success").html(krs.accountInfo.errorDescription ? krs.accountInfo.errorDescription.escapeHTML() : $.t("error_unknown")).show();
				}
			} else {
				if (krs.accountRS && krs.accountInfo.accountRS != krs.accountRS) {
					$.growl("Generated Reed Solomon address different from the one in the blockchain!", {
						"type": "danger"
					});
					krs.accountRS = krs.accountInfo.accountRS;
				}

				if (krs.downloadingBlockchain) {
					$("#dashboard_message").addClass("alert-success").removeClass("alert-danger").html($.t("status_blockchain_downloading")).show();
				} else if (krs.state && krs.state.isScanning) {
					$("#dashboard_message").addClass("alert-danger").removeClass("alert-success").html($.t("status_blockchain_rescanning")).show();
				} else if (!krs.accountInfo.publicKey) {
                    var warning = krs.publicKey != 'undefined' ? $.t("public_key_not_announced_warning", { "public_key": krs.publicKey }) : $.t("no_public_key_warning");
					$("#dashboard_message").addClass("alert-danger").removeClass("alert-success").html(warning + " " + $.t("public_key_actions")).show();
				} else {
					$("#dashboard_message").hide();
				}

				// only show if happened within last week and not during account switch
				var showAssetDifference = !isAccountSwitch &&
					((!krs.downloadingBlockchain || (krs.blocks && krs.blocks[0] && krs.state && krs.state.time - krs.blocks[0].timestamp < 60 * 60 * 24 * 7)));

                // When switching account this query returns error
                if (!isAccountSwitch) {
                    krs.storageSelect("data", [{
                        "id": "asset_balances"
                    }], function (error, asset_balance) {
                        if (asset_balance && asset_balance.length) {
                            var previous_balances = asset_balance[0].contents;
                            if (!krs.accountInfo.assetBalances) {
                                krs.accountInfo.assetBalances = [];
                            }
                            var current_balances = JSON.stringify(krs.accountInfo.assetBalances);
                            if (previous_balances != current_balances) {
                                if (previous_balances != "undefined" && typeof previous_balances != "undefined") {
                                    previous_balances = JSON.parse(previous_balances);
                                } else {
                                    previous_balances = [];
                                }
                                krs.storageUpdate("data", {
                                    contents: current_balances
                                }, [{
                                    id: "asset_balances"
                                }]);
                                if (showAssetDifference) {
                                    krs.checkAssetDifferences(krs.accountInfo.assetBalances, previous_balances);
                                }
                            }
                        } else {
                            krs.storageInsert("data", "id", {
                                id: "asset_balances",
                                contents: JSON.stringify(krs.accountInfo.assetBalances)
                            });
                        }
                    });
                }

				$("#account_balance, #account_balance_sidebar").html(krs.formatStyledAmount(response.unconfirmedBalanceNQT));
				$("#account_forged_balance").html(krs.formatStyledAmount(response.forgedBalanceNQT));

                var i;
				if (response.assetBalances) {
                    var assets = [];
                    var assetBalances = response.assetBalances;
                    var assetBalancesMap = {};
                    for (i = 0; i < assetBalances.length; i++) {
                        if (assetBalances[i].balanceQNT != "0") {
                            assets.push(assetBalances[i].asset);
                            assetBalancesMap[assetBalances[i].asset] = assetBalances[i].balanceQNT;
                        }
                    }
                    krs.sendRequest("getLastTrades", {
                        "assets": assets
                    }, function(response) {
                        if (response.trades && response.trades.length) {
                            var assetTotal = 0;
                            for (i=0; i < response.trades.length; i++) {
                                var trade = response.trades[i];
                                assetTotal += assetBalancesMap[trade.asset] * trade.priceNQT / 100000000;
                            }
                            $("#account_assets_balance").html(krs.formatStyledAmount(new Big(assetTotal).toFixed(8)));
                            $("#account_nr_assets").html(response.trades.length);
                        } else {
                            $("#account_assets_balance").html(0);
                            $("#account_nr_assets").html(0);
                        }
                    });
                } else {
                    $("#account_assets_balance").html(0);
                    $("#account_nr_assets").html(0);
                }

				if (response.accountCurrencies) {
                    var currencies = [];
                    var currencyBalances = response.accountCurrencies;
					var numberOfCurrencies = currencyBalances.length;
					$("#account_nr_currencies").html(numberOfCurrencies);
                    var currencyBalancesMap = {};
                    for (i = 0; i < numberOfCurrencies; i++) {
                        if (currencyBalances[i].units != "0") {
                            currencies.push(currencyBalances[i].currency);
                            currencyBalancesMap[currencyBalances[i].currency] = currencyBalances[i].units;
                        }
                    }
                    krs.sendRequest("getLastExchanges", {
                        "currencies": currencies
                    }, function(response) {
                        if (response.exchanges && response.exchanges.length) {
                            var currencyTotal = 0;
                            for (i=0; i < response.exchanges.length; i++) {
                                var exchange = response.exchanges[i];
                                currencyTotal += currencyBalancesMap[exchange.currency] * exchange.rateNQT / 100000000;
                            }
                            $("#account_currencies_balance").html(krs.formatStyledAmount(new Big(currencyTotal).toFixed(8)));
                        } else {
                            $("#account_currencies_balance").html(0);
                        }
                    });
                } else {
                    $("#account_currencies_balance").html(0);
                    $("#account_nr_currencies").html(0);
                }

				/* Display message count in top and limit to 100 for now because of possible performance issues*/
				krs.sendRequest("getBlockchainTransactions+", {
					"account": krs.account,
					"type": 1,
					"subtype": 0,
					"firstIndex": 0,
					"lastIndex": 99
				}, function(response) {
					if (response.transactions && response.transactions.length) {
						if (response.transactions.length > 99)
							$("#account_message_count").empty().append("99+");
						else
							$("#account_message_count").empty().append(response.transactions.length);
					} else {
						$("#account_message_count").empty().append("0");
					}
				});

				/***  ******************   ***/

				krs.sendRequest("getAliasCount+", {
					"account":krs.account
				}, function(response) {
					if (response.numberOfAliases != null) {
						$("#account_alias_count").empty().append(response.numberOfAliases);
					}
				});

				krs.sendRequest("getDGSPurchaseCount+", {
					"buyer": krs.account
				}, function(response) {
					if (response.numberOfPurchases != null) {
						$("#account_purchase_count").empty().append(response.numberOfPurchases);
					}
				});

				krs.sendRequest("getDGSPendingPurchases+", {
					"seller": krs.account
				}, function(response) {
					if (response.purchases && response.purchases.length) {
						$("#account_pending_sale_count").empty().append(response.purchases.length);
					} else {
						$("#account_pending_sale_count").empty().append("0");
					}
				});

				krs.sendRequest("getDGSPurchaseCount+", {
					"seller": krs.account,
					"completed": true
				}, function(response) {
					if (response.numberOfPurchases != null) {
						$("#account_completed_sale_count").empty().append(response.numberOfPurchases);
					}
				});

                var leasingChange = false;
				if (krs.lastBlockHeight) {
					var isLeased = krs.lastBlockHeight >= krs.accountInfo.currentLeasingHeightFrom;
					if (isLeased != krs.IsLeased) {
						leasingChange = true;
						krs.isLeased = isLeased;
					}
				}

				if (leasingChange ||
					(response.currentLeasingHeightFrom != previousAccountInfo.currentLeasingHeightFrom) ||
					(response.lessors && !previousAccountInfo.lessors) ||
					(!response.lessors && previousAccountInfo.lessors) ||
					(response.lessors && previousAccountInfo.lessors && response.lessors.sort().toString() != previousAccountInfo.lessors.sort().toString())) {
					krs.updateAccountLeasingStatus();
				}

				krs.updateAccountControlStatus();

				if (response.name) {
					$("#account_name").html(krs.addEllipsis(response.name.escapeHTML(), 17)).removeAttr("data-i18n");
				} else {
					$("#account_name").html($.t("set_account_info"));
				}
			}

			if (firstRun) {
				$("#account_balance, #account_balance_sidebar, #account_assets_balance, #account_nr_assets, #account_currencies_balance, #account_nr_currencies, #account_purchase_count, #account_pending_sale_count, #account_completed_sale_count, #account_message_count, #account_alias_count").removeClass("loading_dots");
			}

			if (callback) {
				callback();
			}
		});
	};

	krs.updateAccountLeasingStatus = function() {
		var accountLeasingLabel = "";
		var accountLeasingStatus = "";
		var nextLesseeStatus = "";
		if (krs.accountInfo.nextLeasingHeightFrom < krs.constants.MAX_INT_JAVA) {
			nextLesseeStatus = $.t("next_lessee_status", {
				"start": String(krs.accountInfo.nextLeasingHeightFrom).escapeHTML(),
				"end": String(krs.accountInfo.nextLeasingHeightTo).escapeHTML(),
				"account": String(krs.convertNumericToRSAccountFormat(krs.accountInfo.nextLessee)).escapeHTML()
			})
		}

		if (krs.lastBlockHeight >= krs.accountInfo.currentLeasingHeightFrom) {
			accountLeasingLabel = $.t("leased_out");
			accountLeasingStatus = $.t("balance_is_leased_out", {
				"blocks": String(krs.accountInfo.currentLeasingHeightTo - krs.lastBlockHeight).escapeHTML(),
				"end": String(krs.accountInfo.currentLeasingHeightTo).escapeHTML(),
				"account": String(krs.accountInfo.currentLesseeRS).escapeHTML()
			});
			$("#lease_balance_message").html($.t("balance_leased_out_help"));
		} else if (krs.lastBlockHeight < krs.accountInfo.currentLeasingHeightTo) {
			accountLeasingLabel = $.t("leased_soon");
			accountLeasingStatus = $.t("balance_will_be_leased_out", {
				"blocks": String(krs.accountInfo.currentLeasingHeightFrom - krs.lastBlockHeight).escapeHTML(),
				"start": String(krs.accountInfo.currentLeasingHeightFrom).escapeHTML(),
				"end": String(krs.accountInfo.currentLeasingHeightTo).escapeHTML(),
				"account": String(krs.accountInfo.currentLesseeRS).escapeHTML()
			});
			$("#lease_balance_message").html($.t("balance_leased_out_help"));
		} else {
			accountLeasingStatus = $.t("balance_not_leased_out");
			$("#lease_balance_message").html($.t("balance_leasing_help"));
		}
		if (nextLesseeStatus != "") {
			accountLeasingStatus += "<br>" + nextLesseeStatus;
		}

		//no reed solomon available? do it myself? todo
        var accountLessorTable = $("#account_lessor_table");
        if (krs.accountInfo.lessors) {
			if (accountLeasingLabel) {
				accountLeasingLabel += ", ";
				accountLeasingStatus += "<br /><br />";
			}

			accountLeasingLabel += $.t("x_lessor", {
				"count": krs.accountInfo.lessors.length
			});
			accountLeasingStatus += $.t("x_lessor_lease", {
				"count": krs.accountInfo.lessors.length
			});

			var rows = "";

			for (var i = 0; i < krs.accountInfo.lessorsRS.length; i++) {
				var lessor = krs.accountInfo.lessorsRS[i];
				var lessorInfo = krs.accountInfo.lessorsInfo[i];
				var blocksLeft = lessorInfo.currentHeightTo - krs.lastBlockHeight;
				var blocksLeftTooltip = "From block " + lessorInfo.currentHeightFrom + " to block " + lessorInfo.currentHeightTo;
				var nextLessee = "Not set";
				var nextTooltip = "Next lessee not set";
				if (lessorInfo.nextLesseeRS == krs.accountRS) {
					nextLessee = "You";
					nextTooltip = "From block " + lessorInfo.nextHeightFrom + " to block " + lessorInfo.nextHeightTo;
				} else if (lessorInfo.nextHeightFrom < krs.constants.MAX_INT_JAVA) {
					nextLessee = "Not you";
					nextTooltip = "Account " + krs.getAccountTitle(lessorInfo.nextLesseeRS) +" from block " + lessorInfo.nextHeightFrom + " to block " + lessorInfo.nextHeightTo;
				}
				rows += "<tr>" +
					"<td>" + krs.getAccountLink({ lessorRS: lessor }, "lessor") + "</td>" +
					"<td>" + String(lessorInfo.effectiveBalancekpl).escapeHTML() + "</td>" +
					"<td><label>" + String(blocksLeft).escapeHTML() + " <i class='fa fa-question-circle show_popover' data-toggle='tooltip' title='" + blocksLeftTooltip + "' data-placement='right' style='color:#4CAA6E'></i></label></td>" +
					"<td><label>" + String(nextLessee).escapeHTML() + " <i class='fa fa-question-circle show_popover' data-toggle='tooltip' title='" + nextTooltip + "' data-placement='right' style='color:#4CAA6E'></i></label></td>" +
				"</tr>";
			}

			accountLessorTable.find("tbody").empty().append(rows);
			$("#account_lessor_container").show();
			accountLessorTable.find("[data-toggle='tooltip']").tooltip();
		} else {
			accountLessorTable.find("tbody").empty();
			$("#account_lessor_container").hide();
		}

		if (accountLeasingLabel) {
			$("#account_leasing").html(accountLeasingLabel).show();
		} else {
			$("#account_leasing").hide();
		}

		if (accountLeasingStatus) {
			$("#account_leasing_status").html(accountLeasingStatus).show();
		} else {
			$("#account_leasing_status").hide();
		}
	};

	krs.updateAccountControlStatus = function() {
		var onNoPhasingOnly = function() {
			$("#setup_mandatory_approval").show();
			$("#mandatory_approval_details").hide();
			delete krs.accountInfo.phasingOnly;
		};
		if (krs.accountInfo.accountControls && $.inArray('PHASING_ONLY', krs.accountInfo.accountControls) > -1) {
			krs.sendRequest("getPhasingOnlyControl", {
				"account": krs.account
			}, function (response) {
				if (response && response.votingModel >= 0) {
					$("#setup_mandatory_approval").hide();
					$("#mandatory_approval_details").show();

					krs.accountInfo.phasingOnly = response;
					var infoTable = $("#mandatory_approval_info_table");
					infoTable.find("tbody").empty();
					var data = {};
					var params = krs.phasingControlObjectToPhasingParams(response);
					params.phasingWhitelist = params.phasingWhitelisted;
					krs.getPhasingDetails(data, params);
					delete data.full_hash_formatted_html;
					if (response.minDuration) {
						data.minimum_duration_short = response.minDuration;
					}

					if (response.maxDuration) {
						data.maximum_duration_short = response.maxDuration;
					}

					if (response.maxFees) {
						data.maximum_fees = krs.convertToKPL(response.maxFees);
					}

					infoTable.find("tbody").append(krs.createInfoTable(data));
					infoTable.show();
				} else {
					onNoPhasingOnly();
				}

			});

		} else {
			onNoPhasingOnly();
		}
	};

	krs.checkAssetDifferences = function(current_balances, previous_balances) {
		var current_balances_ = {};
		var previous_balances_ = {};

		if (previous_balances && previous_balances.length) {
			for (var k in previous_balances) {
                if (!previous_balances.hasOwnProperty(k)) {
                    continue;
                }
				previous_balances_[previous_balances[k].asset] = previous_balances[k].balanceQNT;
			}
		}

		if (current_balances && current_balances.length) {
			for (k in current_balances) {
                if (!current_balances.hasOwnProperty(k)) {
                    continue;
                }
				current_balances_[current_balances[k].asset] = current_balances[k].balanceQNT;
			}
		}

		var diff = {};

		for (k in previous_balances_) {
            if (!previous_balances_.hasOwnProperty(k)) {
                continue;
            }
			if (!(k in current_balances_)) {
				diff[k] = "-" + previous_balances_[k];
			} else if (previous_balances_[k] !== current_balances_[k]) {
                diff[k] = (new BigInteger(current_balances_[k]).subtract(new BigInteger(previous_balances_[k]))).toString();
			}
		}

		for (k in current_balances_) {
            if (!current_balances_.hasOwnProperty(k)) {
                continue;
            }
			if (!(k in previous_balances_)) {
				diff[k] = current_balances_[k]; // property is new
			}
		}

		var nr = Object.keys(diff).length;
		if (nr == 0) {
        } else if (nr <= 3) {
			for (k in diff) {
                if (!diff.hasOwnProperty(k)) {
                    continue;
                }
				krs.sendRequest("getAsset", {
					"asset": k,
					"_extra": {
						"asset": k,
						"difference": diff[k]
					}
				}, function(asset, input) {
					if (asset.errorCode) {
						return;
					}
					asset.difference = input["_extra"].difference;
					asset.asset = input["_extra"].asset;
                    var quantity;
					if (asset.difference.charAt(0) != "-") {
						quantity = krs.formatQuantity(asset.difference, asset.decimals);

						if (quantity != "0") {
							if (parseInt(quantity) == 1) {
								$.growl($.t("you_received_assets", {
									"name": String(asset.name).escapeHTML()
								}), {
									"type": "success"
								});
							} else {
								$.growl($.t("you_received_assets_plural", {
									"name": String(asset.name).escapeHTML(),
									"count": quantity
								}), {
									"type": "success"
								});
							}
							krs.loadAssetExchangeSidebar();
						}
					} else {
						asset.difference = asset.difference.substring(1);
						quantity = krs.formatQuantity(asset.difference, asset.decimals);
						if (quantity != "0") {
							if (parseInt(quantity) == 1) {
								$.growl($.t("you_sold_assets", {
									"name": String(asset.name).escapeHTML()
								}), {
									"type": "success"
								});
							} else {
								$.growl($.t("you_sold_assets_plural", {
									"name": String(asset.name).escapeHTML(),
									"count": quantity
								}), {
									"type": "success"
								});
							}
							krs.loadAssetExchangeSidebar();
						}
					}
				});
			}
		} else {
			$.growl($.t("multiple_assets_differences"), {
				"type": "success"
			});
		}
	};

	krs.updateBlockchainDownloadProgress = function() {
		var lastNumBlocks = 5000;
        var downloadingBlockchain = $('#downloading_blockchain');
        downloadingBlockchain.find('.last_num_blocks').html($.t('last_num_blocks', { "blocks": lastNumBlocks }));

		if (!krs.serverConnect || !krs.peerConnect) {
			downloadingBlockchain.find(".db_active").hide();
			downloadingBlockchain.find(".db_halted").show();
		} else {
			downloadingBlockchain.find(".db_halted").hide();
			downloadingBlockchain.find(".db_active").show();

			var percentageTotal = 0;
			var blocksLeft;
			var percentageLast = 0;
			if (krs.state.lastBlockchainFeederHeight && krs.state.numberOfBlocks <= krs.state.lastBlockchainFeederHeight) {
				percentageTotal = parseInt(Math.round((krs.state.numberOfBlocks / krs.state.lastBlockchainFeederHeight) * 100), 10);
				blocksLeft = krs.state.lastBlockchainFeederHeight - krs.state.numberOfBlocks;
				if (blocksLeft <= lastNumBlocks && krs.state.lastBlockchainFeederHeight > lastNumBlocks) {
					percentageLast = parseInt(Math.round(((lastNumBlocks - blocksLeft) / lastNumBlocks) * 100), 10);
				}
			}
			if (!blocksLeft || blocksLeft < parseInt(lastNumBlocks / 2)) {
				downloadingBlockchain.find(".db_progress_total").hide();
			} else {
				downloadingBlockchain.find(".db_progress_total").show();
				downloadingBlockchain.find(".db_progress_total .progress-bar").css("width", percentageTotal + "%");
				downloadingBlockchain.find(".db_progress_total .sr-only").html($.t("percent_complete", {
					"percent": percentageTotal
				}));
			}
			if (!blocksLeft || blocksLeft >= (lastNumBlocks * 2) || krs.state.lastBlockchainFeederHeight <= lastNumBlocks) {
				downloadingBlockchain.find(".db_progress_last").hide();
			} else {
				downloadingBlockchain.find(".db_progress_last").show();
				downloadingBlockchain.find(".db_progress_last .progress-bar").css("width", percentageLast + "%");
				downloadingBlockchain.find(".db_progress_last .sr-only").html($.t("percent_complete", {
					"percent": percentageLast
				}));
			}
			if (blocksLeft) {
				downloadingBlockchain.find(".blocks_left_outer").show();
				downloadingBlockchain.find(".blocks_left").html($.t("blocks_left", { "numBlocks": blocksLeft }));
			}
		}
	};

	krs.checkIfOnAFork = function() {
		if (!krs.downloadingBlockchain) {
			var isForgingAllBlocks = true;
			if (krs.blocks && krs.blocks.length >= 10) {
				for (var i = 0; i < 10; i++) {
					if (krs.blocks[i].generator != krs.account) {
						isForgingAllBlocks = false;
						break;
					}
				}
			} else {
				isForgingAllBlocks = false;
			}
/*
			if (isForgingAllBlocks) {
				$.growl($.t("fork_warning"), {
					"type": "danger"
				});
			}
*/
            if (krs.baseTargetPercent(krs.blocks[0]) > 1000 && !krs.isTestNet) {
                $.growl($.t("fork_warning_base_target"), {
                    "type": "danger"
                });
            }
		}
	};

    krs.printEnvInfo = function() {
        krs.logProperty("navigator.userAgent");
        krs.logProperty("navigator.platform");
        krs.logProperty("navigator.appVersion");
        krs.logProperty("navigator.appName");
        krs.logProperty("navigator.appCodeName");
        krs.logProperty("navigator.hardwareConcurrency");
        krs.logProperty("navigator.maxTouchPoints");
        krs.logProperty("navigator.languages");
        krs.logProperty("navigator.language");
        krs.logProperty("navigator.userLanguage");
        krs.logProperty("navigator.cookieEnabled");
        krs.logProperty("navigator.onLine");
        krs.logProperty("krs.isTestNet");
        krs.logProperty("krs.needsAdminPassword");
    };

	$("#id_search").on("submit", function(e) {
		e.preventDefault();

		var id = $.trim($("#id_search").find("input[name=q]").val());

		if (/KPL\-/i.test(id)) {
			krs.sendRequest("getAccount", {
				"account": id
			}, function(response, input) {
				if (!response.errorCode) {
					response.account = input.account;
					krs.showAccountModal(response);
				} else {
					$.growl($.t("error_search_no_results"), {
						"type": "danger"
					});
				}
			});
		} else {
			if (!/^\d+$/.test(id)) {
				$.growl($.t("error_search_invalid"), {
					"type": "danger"
				});
				return;
			}
			krs.sendRequest("getTransaction", {
				"transaction": id
			}, function(response, input) {
				if (!response.errorCode) {
					response.transaction = input.transaction;
					krs.showTransactionModal(response);
				} else {
					krs.sendRequest("getAccount", {
						"account": id
					}, function(response, input) {
						if (!response.errorCode) {
							response.account = input.account;
							krs.showAccountModal(response);
						} else {
							krs.sendRequest("getBlock", {
								"block": id,
                                "includeTransactions": "true"
							}, function(response, input) {
								if (!response.errorCode) {
									response.block = input.block;
									krs.showBlockModal(response);
								} else {
									$.growl($.t("error_search_no_results"), {
										"type": "danger"
									});
								}
							});
						}
					});
				}
			});
		}
	});

	function checkLocalStorage() {
	    var storage;
	    var fail;
	    var uid;
	    try {
	        uid = String(new Date());
	        (storage = window.localStorage).setItem(uid, uid);
	        fail = storage.getItem(uid) != uid;
	        storage.removeItem(uid);
	        fail && (storage = false);
	    } catch (exception) {
	        krs.logConsole("checkLocalStorage " + exception.message)
	    }
	    return storage;
	}

	return krs;
}(krs || {}, jQuery));

$(document).ready(function() {
	console.log("document.ready");
	krs.init();
});