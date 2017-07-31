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
 * @depends {krs.modals.js}
 */
var krs = (function(krs, $) {
	krs.userInfoModal = {
		"user": 0
	};

	var body = $("body");
    body.on("click", ".show_account_modal_action, a[data-user].user_info", function(e) {
		e.preventDefault();
		var account = $(this).data("user");
        if ($(this).data("back") == "true") {
            krs.modalStack.pop(); // The forward modal
            krs.modalStack.pop(); // The current modal
        }
		krs.showAccountModal(account);
	});

	krs.showAccountModal = function(account) {
		if (krs.fetchingModalData) {
			return;
		}

		if (typeof account == "object") {
			krs.userInfoModal.user = account.account;
		} else {
			krs.userInfoModal.user = account;
			krs.fetchingModalData = true;
		}
        krs.setBackLink();
		krs.modalStack.push({ class: "show_account_modal_action", key: "user", value: account});

		$("#user_info_modal_account").html(krs.getAccountFormatted(krs.userInfoModal.user));
		var accountButton;
		if (krs.userInfoModal.user in krs.contacts) {
			accountButton = krs.contacts[krs.userInfoModal.user].name.escapeHTML();
			$("#user_info_modal_add_as_contact").hide();
		} else {
			accountButton = krs.userInfoModal.user;
			$("#user_info_modal_add_as_contact").show();
		}

		$("#user_info_modal_actions").find("button").data("account", accountButton);

		if (krs.fetchingModalData) {
			krs.sendRequest("getAccount", {
				"account": krs.userInfoModal.user
            }, function(response) {
				krs.processAccountModalData(response);
				krs.fetchingModalData = false;
			});
		} else {
			krs.processAccountModalData(account);
		}
		$("#user_info_modal_transactions").show();
		krs.userInfoModal.transactions();
	};

	krs.processAccountModalData = function(account) {
		if (account.unconfirmedBalanceNQT == "0") {
			$("#user_info_modal_account_balance").html("0");
		} else {
			$("#user_info_modal_account_balance").html(krs.formatAmount(account.unconfirmedBalanceNQT) + " KPL");
		}

		if (account.name) {
			$("#user_info_modal_account_name").html(String(account.name).escapeHTML());
			$("#user_info_modal_account_name_container").show();
		} else {
			$("#user_info_modal_account_name_container").hide();
		}

		if (account.description) {
			$("#user_info_description").show();
			$("#user_info_modal_description").html(String(account.description).escapeHTML().nl2br());
		} else {
			$("#user_info_description").hide();
		}
		var switchAccount = $("#user_info_switch_account");
        if (krs.accountRS != account.accountRS) {
			switchAccount.html("<a class='btn btn-info btn-xs switch-account' data-account='" + account.accountRS + "'>" + $.t("switch_account") + "</a>");
			switchAccount.show();
		} else {
			switchAccount.hide();
		}

        var userInfoModal = $("#user_info_modal");
        if (!userInfoModal.data('bs.modal') || !userInfoModal.data('bs.modal').isShown) {
            userInfoModal.modal("show");
        }
	};

	body.on("click", ".switch-account", function() {
		var account = $(this).data("account");
		krs.closeModal($("#user_info_modal"));
		krs.switchAccount(account);
	});

	var userInfoModal = $("#user_info_modal");
    userInfoModal.on("hidden.bs.modal", function() {
		$(this).find(".user_info_modal_content").hide();
		$(this).find(".user_info_modal_content table tbody").empty();
		$(this).find(".user_info_modal_content:not(.data-loading,.data-never-loading)").addClass("data-loading");
		$(this).find("ul.nav li.active").removeClass("active");
		$("#user_info_transactions").addClass("active");
		krs.userInfoModal.user = 0;
	});

	userInfoModal.find("ul.nav li").click(function(e) {
		e.preventDefault();
		var tab = $(this).data("tab");
		$(this).siblings().removeClass("active");
		$(this).addClass("active");
		$(".user_info_modal_content").hide();

		var content = $("#user_info_modal_" + tab);
		content.show();
		if (content.hasClass("data-loading")) {
			krs.userInfoModal[tab]();
		}
	});

    function getTransactionType(transaction) {
        var transactionType = $.t(krs.transactionTypes[transaction.type].subTypes[transaction.subtype].i18nKeyTitle);
        if (transaction.type == krs.subtype.AliasSell.type && transaction.subtype == krs.subtype.AliasSell.subtype) {
            if (transaction.attachment.priceNQT == "0") {
                if (transaction.sender == transaction.recipient) {
                    transactionType = $.t("alias_sale_cancellation");
                } else {
                    transactionType = $.t("alias_transfer");
                }
            } else {
                transactionType = $.t("alias_sale");
            }
        }
        return transactionType;
    }

    krs.userInfoModal.transactions = function() {
        krs.sendRequest("getBlockchainTransactions", {
			"account": krs.userInfoModal.user,
			"firstIndex": 0,
			"lastIndex": 100
		}, function(response) {
            var infoModalTransactionsTable = $("#user_info_modal_transactions_table");
			if (response.transactions && response.transactions.length) {
				var rows = "";
				var amountDecimals = krs.getNumberOfDecimals(response.transactions, "amountNQT", function(val) {
					return krs.formatAmount(val.amountNQT);
				});
				var feeDecimals = krs.getNumberOfDecimals(response.transactions, "fee", function(val) {
					return krs.formatAmount(val.fee);
				});
				for (var i = 0; i < response.transactions.length; i++) {
					var transaction = response.transactions[i];
                    var transactionType = getTransactionType(transaction);
                    var receiving;
					if (/^KPL\-/i.test(String(krs.userInfoModal.user))) {
						receiving = (transaction.recipientRS == krs.userInfoModal.user);
					} else {
						receiving = (transaction.recipient == krs.userInfoModal.user);
					}

					if (transaction.amountNQT) {
						transaction.amount = new BigInteger(transaction.amountNQT);
						transaction.fee = new BigInteger(transaction.feeNQT);
					}
					var account = (receiving ? "sender" : "recipient");
					rows += "<tr>" +
						"<td>" + krs.getTransactionLink(transaction.transaction, krs.formatTimestamp(transaction.timestamp)) + "</td>" +
						"<td>" + krs.getTransactionIconHTML(transaction.type, transaction.subtype) + "&nbsp" + transactionType + "</td>" +
						"<td class='numeric'  " + (transaction.type == 0 && receiving ? " style='color:#006400;'" : (!receiving && transaction.amount > 0 ? " style='color:red'" : "")) + ">" + (!receiving && transaction.amount > 0 ? "-" : "")  + "" + krs.formatAmount(transaction.amount, false, false, amountDecimals) + "</td>" +
						"<td class='numeric' " + (!receiving ? " style='color:red'" : "") + ">" + krs.formatAmount(transaction.fee, false, false, feeDecimals) + "</td>" +
						"<td>" + krs.getAccountLink(transaction, account) + "</td>" +
					"</tr>";
				}

				infoModalTransactionsTable.find("tbody").empty().append(rows);
				krs.dataLoadFinished(infoModalTransactionsTable);
			} else {
				infoModalTransactionsTable.find("tbody").empty();
				krs.dataLoadFinished(infoModalTransactionsTable);
			}
		});
	};

    krs.userInfoModal.ledger = function() {
        krs.sendRequest("getAccountLedger", {
            "account": krs.userInfoModal.user,
            "includeHoldingInfo": true,
            "firstIndex": 0,
            "lastIndex": 100
        }, function (response) {
            var infoModalLedgerTable = $("#user_info_modal_ledger_table");
            if (response.entries && response.entries.length) {
                var rows = "";
				var decimalParams = krs.getLedgerNumberOfDecimals(response.entries);
				for (var i = 0; i < response.entries.length; i++) {
                    var entry = response.entries[i];
                    rows += krs.getLedgerEntryRow(entry, decimalParams);
                }
                infoModalLedgerTable.find("tbody").empty().append(rows);
                krs.dataLoadFinished(infoModalLedgerTable);
            } else {
                infoModalLedgerTable.find("tbody").empty();
                krs.dataLoadFinished(infoModalLedgerTable);
            }
        });
	};

	krs.userInfoModal.aliases = function() {
		krs.sendRequest("getAliases", {
			"account": krs.userInfoModal.user,
			"firstIndex": 0,
			"lastIndex": 100
		}, function(response) {
			var rows = "";
			if (response.aliases && response.aliases.length) {
				var aliases = response.aliases;
				aliases.sort(function(a, b) {
					if (a.aliasName.toLowerCase() > b.aliasName.toLowerCase()) {
						return 1;
					} else if (a.aliasName.toLowerCase() < b.aliasName.toLowerCase()) {
						return -1;
					} else {
						return 0;
					}
				});
				for (var i = 0; i < aliases.length; i++) {
					var alias = aliases[i];
					rows += "<tr data-alias='" + String(alias.aliasName).toLowerCase().escapeHTML() + "'><td class='alias'>" + String(alias.aliasName).escapeHTML() + "</td><td class='uri'>" + (alias.aliasURI.indexOf("http") === 0 ? "<a href='" + String(alias.aliasURI).escapeHTML() + "' target='_blank'>" + String(alias.aliasURI).escapeHTML() + "</a>" : String(alias.aliasURI).escapeHTML()) + "</td></tr>";
				}
			}
            var infoModalAliasesTable = $("#user_info_modal_aliases_table");
            infoModalAliasesTable.find("tbody").empty().append(rows);
			krs.dataLoadFinished(infoModalAliasesTable);
		});
	};

	krs.userInfoModal.marketplace = function() {
		krs.sendRequest("getDGSGoods", {
			"seller": krs.userInfoModal.user,
			"firstIndex": 0,
			"lastIndex": 100
		}, function(response) {
			var rows = "";
			var quantityDecimals = krs.getNumberOfDecimals(response.goods, "quantity", function(val) {
				return krs.format(val.quantity);
			});
			var priceDecimals = krs.getNumberOfDecimals(response.goods, "priceNQT", function(val) {
				return krs.formatAmount(val.priceNQT);
			});
			if (response.goods && response.goods.length) {
				for (var i = 0; i < response.goods.length; i++) {
					var good = response.goods[i];
					if (good.name.length > 150) {
						good.name = good.name.substring(0, 150) + "...";
					}
					rows += "<tr><td><a href='#' data-goto-goods='" + String(good.goods).escapeHTML() + "' data-seller='" + String(krs.userInfoModal.user).escapeHTML() + "'>" + String(good.name).escapeHTML() + "</a></td><td class='numeric'>" + krs.formatAmount(good.priceNQT, false, false, priceDecimals) + " KPL</td><td class='numeric'>" + krs.format(good.quantity, false, quantityDecimals) + "</td></tr>";
				}
			}
            var infoModalMarketplaceTable = $("#user_info_modal_marketplace_table");
            infoModalMarketplaceTable.find("tbody").empty().append(rows);
			krs.dataLoadFinished(infoModalMarketplaceTable);
		});
	};
	
	krs.userInfoModal.currencies = function() {
		krs.sendRequest("getAccountCurrencies+", {
			"account": krs.userInfoModal.user,
			"includeCurrencyInfo": true
		}, function(response) {
			var rows = "";
			var unitsDecimals = krs.getNumberOfDecimals(response.accountCurrencies, "unconfirmedUnits", function(val) {
				return krs.formatQuantity(val.unconfirmedUnits, val.decimals);
			});
			if (response.accountCurrencies && response.accountCurrencies.length) {
				for (var i = 0; i < response.accountCurrencies.length; i++) {
					var currency = response.accountCurrencies[i];
					var code = String(currency.code).escapeHTML();
					rows += "<tr>" +
						"<td>" + krs.getTransactionLink(String(currency.currency).escapeHTML(), code) + "</td>" +
						"<td>" + currency.name + "</td>" +
						"<td class='numeric'>" + krs.formatQuantity(currency.unconfirmedUnits, currency.decimals, false, unitsDecimals) + "</td>" +
					"</tr>";
				}
			}
            var infoModalCurrenciesTable = $("#user_info_modal_currencies_table");
            infoModalCurrenciesTable.find("tbody").empty().append(rows);
			krs.dataLoadFinished(infoModalCurrenciesTable);
		});
	};

	krs.userInfoModal.assets = function() {
		krs.sendRequest("getAccount", {
			"account": krs.userInfoModal.user,
            "includeAssets": true
        }, function(response) {
			if (response.assetBalances && response.assetBalances.length) {
				var assets = {};
				var nrAssets = 0;
				var ignoredAssets = 0; // Optimization to reduce number of getAsset calls
				for (var i = 0; i < response.assetBalances.length; i++) {
					if (response.assetBalances[i].balanceQNT == "0") {
						ignoredAssets++;
						if (nrAssets + ignoredAssets == response.assetBalances.length) {
							krs.userInfoModal.addIssuedAssets(assets);
						}
						continue;
					}

					krs.sendRequest("getAsset", {
						"asset": response.assetBalances[i].asset,
						"_extra": {
							"balanceQNT": response.assetBalances[i].balanceQNT
						}
					}, function(asset, input) {
						asset.asset = input.asset;
						asset.balanceQNT = input["_extra"].balanceQNT;
						assets[asset.asset] = asset;
						nrAssets++;
                        // This will work since eventually the condition below or in the previous
                        // if statement would be met
						//noinspection JSReferencingMutableVariableFromClosure
                        if (nrAssets + ignoredAssets == response.assetBalances.length) {
							krs.userInfoModal.addIssuedAssets(assets);
						}
					});
				}
			} else {
				krs.userInfoModal.addIssuedAssets({});
			}
		});
	};

	krs.userInfoModal.trade_history = function() {
		krs.sendRequest("getTrades", {
			"account": krs.userInfoModal.user,
			"includeAssetInfo": true,
			"firstIndex": 0,
			"lastIndex": 100
		}, function(response) {
			var rows = "";
			var quantityDecimals = krs.getNumberOfDecimals(response.trades, "quantityQNT", function(val) {
				return krs.formatQuantity(val.quantityQNT, val.decimals);
			});
			var priceDecimals = krs.getNumberOfDecimals(response.trades, "priceNQT", function(val) {
				return krs.formatOrderPricePerWholeQNT(val.priceNQT, val.decimals);
			});
			var amountDecimals = krs.getNumberOfDecimals(response.trades, "totalNQT", function(val) {
				return krs.formatAmount(krs.calculateOrderTotalNQT(val.quantityQNT, val.priceNQT));
			});
			if (response.trades && response.trades.length) {
				var trades = response.trades;
				for (var i = 0; i < trades.length; i++) {
					trades[i].priceNQT = new BigInteger(trades[i].priceNQT);
					trades[i].quantityQNT = new BigInteger(trades[i].quantityQNT);
					trades[i].totalNQT = new BigInteger(krs.calculateOrderTotalNQT(trades[i].priceNQT, trades[i].quantityQNT));
					var type = (trades[i].buyerRS == krs.userInfoModal.user ? "buy" : "sell");
					rows += "<tr><td><a href='#' data-goto-asset='" + String(trades[i].asset).escapeHTML() + "'>" + String(trades[i].name).escapeHTML() + "</a></td><td>" + krs.formatTimestamp(trades[i].timestamp) + "</td><td style='color:" + (type == "buy" ? "green" : "red") + "'>" + $.t(type) + "</td><td class='numeric'>" + krs.formatQuantity(trades[i].quantityQNT, trades[i].decimals, false, quantityDecimals) + "</td><td class='asset_price numeric'>" + krs.formatOrderPricePerWholeQNT(trades[i].priceNQT, trades[i].decimals, priceDecimals) + "</td><td class='numeric' style='color:" + (type == "buy" ? "red" : "green") + "'>" + krs.formatAmount(trades[i].totalNQT, false, false, amountDecimals) + "</td></tr>";
				}
			}
            var infoModalTradeHistoryTable = $("#user_info_modal_trade_history_table");
            infoModalTradeHistoryTable.find("tbody").empty().append(rows);
			krs.dataLoadFinished(infoModalTradeHistoryTable);
		});
	};

	krs.userInfoModal.addIssuedAssets = function(assets) {
		krs.sendRequest("getAssetsByIssuer", {
			"account": krs.userInfoModal.user
		}, function(response) {
			if (response.assets && response.assets[0] && response.assets[0].length) {
				$.each(response.assets[0], function(key, issuedAsset) {
					if (assets[issuedAsset.asset]) {
						assets[issuedAsset.asset].issued = true;
					} else {
						issuedAsset.balanceQNT = "0";
						issuedAsset.issued = true;
						assets[issuedAsset.asset] = issuedAsset;
					}
				});
				krs.userInfoModal.assetsLoaded(assets);
			} else if (!$.isEmptyObject(assets)) {
				krs.userInfoModal.assetsLoaded(assets);
			} else {
                var infoModalAssetsTable = $("#user_info_modal_assets_table");
                infoModalAssetsTable.find("tbody").empty();
				krs.dataLoadFinished(infoModalAssetsTable);
			}
		});
	};

	krs.userInfoModal.assetsLoaded = function(assets) {
		var assetArray = [];
		var rows = "";
		$.each(assets, function(key, asset) {
			assetArray.push(asset);
		});
		assetArray.sort(function(a, b) {
			if (a.issued && b.issued) {
				if (a.name.toLowerCase() > b.name.toLowerCase()) {
					return 1;
				} else if (a.name.toLowerCase() < b.name.toLowerCase()) {
					return -1;
				} else {
					return 0;
				}
			} else if (a.issued) {
				return -1;
			} else if (b.issued) {
				return 1;
			} else {
				if (a.name.toLowerCase() > b.name.toLowerCase()) {
					return 1;
				} else if (a.name.toLowerCase() < b.name.toLowerCase()) {
					return -1;
				} else {
					return 0;
				}
			}
		});
		var quantityDecimals = krs.getNumberOfDecimals(assetArray, "balanceQNT", function(val) {
			return krs.formatQuantity(val.balanceQNT, val.decimals);
		});
		var totalDecimals = krs.getNumberOfDecimals(assetArray, "quantityQNT", function(val) {
			return krs.formatQuantity(val.quantityQNT, val.decimals);
		});
		for (var i = 0; i < assetArray.length; i++) {
			var asset = assetArray[i];
			var percentageAsset = krs.calculatePercentage(asset.balanceQNT, asset.quantityQNT);
			rows += "<tr" + (asset.issued ? " class='asset_owner'" : "") + "><td><a href='#' data-goto-asset='" + String(asset.asset).escapeHTML() + "'" + (asset.issued ? " style='font-weight:bold'" : "") + ">" + String(asset.name).escapeHTML() + "</a></td><td class='quantity numeric'>" + krs.formatQuantity(asset.balanceQNT, asset.decimals, false, quantityDecimals) + "</td><td class='numeric'>" + krs.formatQuantity(asset.quantityQNT, asset.decimals, false, totalDecimals) + "</td><td>" + percentageAsset + "%</td></tr>";
		}

        var infoModalAssetsTable = $("#user_info_modal_assets_table");
        infoModalAssetsTable.find("tbody").empty().append(rows);
		krs.dataLoadFinished(infoModalAssetsTable);
	};

	return krs;
}(krs || {}, jQuery));