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
var krs = (function (krs, $, undefined) {
    var assets;
    var assetIds;
    var closedGroups;
    var assetSearch;
    var viewingAsset;
    var currentAsset;
    var assetTradeHistoryType;
    var currentAssetID;
    var selectedApprovalAsset;

    krs.resetAssetExchangeState = function () {
        assets = [];
        assetIds = [];
        closedGroups = [];
        assetSearch = false;
        viewingAsset = false; //viewing non-bookmarked asset
        currentAsset = {};
        assetTradeHistoryType = "everyone";
        currentAssetID = 0;
        selectedApprovalAsset = "";
    };
    krs.resetAssetExchangeState();

    krs.setClosedGroups = function(groups) {
        closedGroups = groups;
    };

    krs.getCurrentAsset = function() {
        return currentAsset;
    };

    function loadAssetFromURL() {
        var page = krs.getUrlParameter("page");
        var asset = krs.getUrlParameter("asset");
        if (!page || page != "asset_exchange") {
            return;
        }
        if (!asset) {
            $.growl($.t("missing_asset_param"), {
                "type": "danger"
            });
            return;
        }
        page = page.escapeHTML();
        asset = asset.escapeHTML();
        krs.sendRequest("getAsset", {
            "asset": asset
        }, function(response) {
            if (response.errorCode) {
                $.growl($.t("invalid_asset_param", { asset: asset }), {
                    "type": "danger"
                });
            } else {
                krs.loadAsset(response, false);
            }
        });
    }
    
    krs.pages.asset_exchange = function (callback) {
        $(".content.content-stretch:visible").width($(".page:visible").width());
        assets = [];
        assetIds = [];
        krs.storageSelect("assets", null, function (error, assets) {
            //select already bookmarked assets
            $.each(assets, function (index, asset) {
                krs.cacheAsset(asset);
            });

            //check owned assets, see if any are not yet in bookmarked assets
            if (krs.accountInfo.unconfirmedAssetBalances) {
                var newAssetIds = [];

                $.each(krs.accountInfo.unconfirmedAssetBalances, function (key, assetBalance) {
                    if (assetIds.indexOf(assetBalance.asset) == -1) {
                        newAssetIds.push(assetBalance.asset);
                        assetIds.push(assetBalance.asset);
                    }
                });

                //add to bookmarked assets
                if (newAssetIds.length) {
                    var qs = [];
                    for (var i = 0; i < newAssetIds.length; i++) {
                        qs.push("assets=" + encodeURIComponent(newAssetIds[i]));
                    }
                    qs = qs.join("&");
                    //first get the assets info
                    krs.sendRequest("getAssets+", {
                        // This hack is used to manually compose the query string. The querystring param is later
                        // transformed into the actual request data before sending to the server.
                        "querystring": qs
                    }, function (response) {
                        if (response.assets && response.assets.length) {
                            krs.saveAssetBookmarks(response.assets, function () {
                                krs.loadAssetExchangeSidebar(callback);
                            });
                        } else {
                            krs.loadAssetExchangeSidebar(callback);
                        }
                    });
                } else {
                    krs.loadAssetExchangeSidebar(callback);
                }
            } else {
                krs.loadAssetExchangeSidebar(callback);
            }
        });
        loadAssetFromURL();
    };

    krs.cacheAsset = function (asset) {
        if (assetIds.indexOf(asset.asset) != -1) {
            return;
        }
        assetIds.push(asset.asset);
        if (!asset.groupName) {
            asset.groupName = "";
        }

        var cachedAsset = {
            "asset": String(asset.asset),
            "name": String(asset.name).toLowerCase(),
            "description": String(asset.description),
            "groupName": String(asset.groupName).toLowerCase(),
            "account": String(asset.account),
            "accountRS": String(asset.accountRS),
            "quantityQNT": String(asset.quantityQNT),
            "decimals": parseInt(asset.decimals, 10)
        };
        assets.push(cachedAsset);
    };

    krs.forms.addAssetBookmark = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        data.id = $.trim(data.id);
        if (!data.id) {
            return {
                "error": $.t("error_asset_or_account_id_required")
            };
        }

        if (!/^\d+$/.test(data.id) && !/^KPL\-/i.test(data.id)) {
            return {
                "error": $.t("error_asset_or_account_id_invalid")
            };
        }

        if (/^KPL\-/i.test(data.id)) {
            krs.sendRequest("getAssetsByIssuer", {
                "account": data.id
            }, function (response) {
                if (response.errorCode) {
                    krs.showModalError(krs.translateServerError(response), $modal);
                } else {
                    if (response.assets && response.assets[0] && response.assets[0].length) {
                        krs.saveAssetBookmarks(response.assets[0], krs.forms.addAssetBookmarkComplete);
                    } else {
                        krs.showModalError($.t("account_no_assets"), $modal);
                    }
                    //krs.saveAssetIssuer(data.id);
                }
            });
        } else {
            krs.sendRequest("getAsset", {
                "asset": data.id
            }, function (response) {
                if (response.errorCode) {
                    krs.sendRequest("getAssetsByIssuer", {
                        "account": data.id
                    }, function (response) {
                        if (response.errorCode) {
                            krs.showModalError(krs.translateServerError(response), $modal);
                        } else {
                            if (response.assets && response.assets[0] && response.assets[0].length) {
                                krs.saveAssetBookmarks(response.assets[0], krs.forms.addAssetBookmarkComplete);
                                //krs.saveAssetIssuer(data.id);
                            } else {
                                krs.showModalError($.t("no_asset_found"), $modal);
                            }
                        }
                    });
                } else {
                    krs.saveAssetBookmarks(new Array(response), krs.forms.addAssetBookmarkComplete);
                }
            });
        }
    };

    $("#asset_exchange_bookmark_this_asset").on("click", function () {
        if (viewingAsset) {
            krs.saveAssetBookmarks(new Array(viewingAsset), function (newAssets) {
                viewingAsset = false;
                krs.loadAssetExchangeSidebar(function () {
                    $("#asset_exchange_sidebar").find("a[data-asset=" + newAssets[0].asset + "]").addClass("active").trigger("click");
                });
            });
        }
    });

    krs.forms.addAssetBookmarkComplete = function (newAssets, submittedAssets) {
        assetSearch = false;
        var assetExchangeSidebar = $("#asset_exchange_sidebar");
        if (newAssets.length == 0) {
            krs.closeModal();
            $.growl($.t("error_asset_already_bookmarked", {
                "count": submittedAssets.length
            }), {
                "type": "danger"
            });
            assetExchangeSidebar.find("a.active").removeClass("active");
            assetExchangeSidebar.find("a[data-asset=" + submittedAssets[0].asset + "]").addClass("active").trigger("click");
        } else {
            krs.closeModal();
            var message = $.t("success_asset_bookmarked", {
                "count": newAssets.length
            });
            $.growl(message, {
                "type": "success"
            });
            krs.loadAssetExchangeSidebar(function () {
                assetExchangeSidebar.find("a.active").removeClass("active");
                assetExchangeSidebar.find("a[data-asset=" + newAssets[0].asset + "]").addClass("active").trigger("click");
            });
        }
    };

    krs.saveAssetBookmarks = function (assetsNew, callback) {
        var newAssetIds = [];
        var newAssets = [];

        $.each(assetsNew, function (key, asset) {
            var newAsset = {
                "asset": String(asset.asset),
                "name": String(asset.name),
                "description": String(asset.description),
                "account": String(asset.account),
                "accountRS": String(asset.accountRS),
                "quantityQNT": String(asset.quantityQNT),
                "decimals": parseInt(asset.decimals, 10),
                "groupName": ""
            };
            newAssets.push(newAsset);
            newAssetIds.push({
                "asset": String(asset.asset)
            });
        });

        krs.storageSelect("assets", newAssetIds, function (error, existingAssets) {
            var existingIds = [];
            if (existingAssets.length) {
                $.each(existingAssets, function (index, asset) {
                    existingIds.push(asset.asset);
                });

                newAssets = $.grep(newAssets, function (v) {
                    return (existingIds.indexOf(v.asset) === -1);
                });
            }

            if (newAssets.length == 0) {
                if (callback) {
                    callback([], assets);
                }
            } else {
                krs.storageInsert("assets", "asset", newAssets, function () {
                    $.each(newAssets, function (key, asset) {
                        asset.name = asset.name.toLowerCase();
                        assetIds.push(asset.asset);
                        assets.push(asset);
                    });

                    if (callback) {
                        //for some reason we need to wait a little or DB won't be able to fetch inserted record yet..
                        setTimeout(function () {
                            callback(newAssets, assets);
                        }, 50);
                    }
                });
            }
        });
    };

    krs.positionAssetSidebar = function () {
        var assetExchangeSidebar = $("#asset_exchange_sidebar");
        assetExchangeSidebar.parent().css("position", "relative");
        assetExchangeSidebar.parent().css("padding-bottom", "5px");
        assetExchangeSidebar.height($(window).height() - 120);
    };

    //called on opening the asset exchange page and automatic refresh
    krs.loadAssetExchangeSidebar = function (callback) {
        var assetExchangePage = $("#asset_exchange_page");
        var assetExchangeSidebarContent = $("#asset_exchange_sidebar_content");
        if (!assets.length) {
            krs.pageLoaded(callback);
            assetExchangeSidebarContent.empty();
            if (!viewingAsset) {
                $("#no_asset_selected, #loading_asset_data, #no_asset_search_results, #asset_details").hide();
                $("#no_assets_available").show();
            }
            assetExchangePage.addClass("no_assets");
            return;
        }

        var rows = "";
        assetExchangePage.removeClass("no_assets");
        krs.positionAssetSidebar();
        assets.sort(function (a, b) {
            if (!a.groupName && !b.groupName) {
                if (a.name > b.name) {
                    return 1;
                } else if (a.name < b.name) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (!a.groupName) {
                return 1;
            } else if (!b.groupName) {
                return -1;
            } else if (a.groupName > b.groupName) {
                return 1;
            } else if (a.groupName < b.groupName) {
                return -1;
            } else {
                if (a.name > b.name) {
                    return 1;
                } else if (a.name < b.name) {
                    return -1;
                } else {
                    return 0;
                }
            }
        });

        var lastGroup = "";
        var ungrouped = true;
        var isClosedGroup = false;
        var isSearch = (assetSearch !== false);
        var searchResults = 0;

        for (var i = 0; i < assets.length; i++) {
            var asset = assets[i];
            if (isSearch) {
                if (assetSearch.indexOf(asset.asset) == -1) {
                    continue;
                } else {
                    searchResults++;
                }
            }

            if (asset.groupName.toLowerCase() != lastGroup) {
                var to_check = (asset.groupName ? asset.groupName : "undefined");
                isClosedGroup = closedGroups.indexOf(to_check) != -1;
                if (asset.groupName) {
                    ungrouped = false;
                    rows += "<a href='#' class='list-group-item list-group-item-header" + (asset.groupName == "Ignore List" ? " no-context" : "") + "'";
                    rows += (asset.groupName != "Ignore List" ? " data-context='asset_exchange_sidebar_group_context' " : "data-context=''");
                    rows += " data-groupname='" + asset.groupName.escapeHTML() + "' data-closed='" + isClosedGroup + "'>";
                    rows += "<h4 class='list-group-item-heading'>" + asset.groupName.toUpperCase().escapeHTML() + "</h4>";
                    rows += "<i class='fa fa-angle-" + (isClosedGroup ? "right" : "down") + " group_icon'></i></h4></a>";
                } else {
                    ungrouped = true;
                    rows += "<a href='#' class='list-group-item list-group-item-header no-context' data-closed='" + isClosedGroup + "'>";
                    rows += "<h4 class='list-group-item-heading'>UNGROUPED <i class='fa pull-right fa-angle-" + (isClosedGroup ? "right" : "down") + "'></i></h4>";
                    rows += "</a>";
                }
                lastGroup = asset.groupName.toLowerCase();
            }

            var ownsAsset = false;
            var ownsQuantityQNT = 0;
            if (krs.accountInfo.assetBalances) {
                $.each(krs.accountInfo.assetBalances, function (key, assetBalance) {
                    if (assetBalance.asset == asset.asset && assetBalance.balanceQNT != "0") {
                        ownsAsset = true;
                        ownsQuantityQNT = assetBalance.balanceQNT;
                        return false;
                    }
                });
            }

            rows += "<a href='#' class='list-group-item list-group-item-" + (ungrouped ? "ungrouped" : "grouped") + (ownsAsset ? " owns_asset" : " not_owns_asset") + "' ";
            rows += "data-cache='" + i + "' ";
            rows += "data-asset='" + String(asset.asset).escapeHTML() + "'" + (!ungrouped ? " data-groupname='" + asset.groupName.escapeHTML() + "'" : "");
            rows += (isClosedGroup ? " style='display:none'" : "") + " data-closed='" + isClosedGroup + "'>";
            rows += "<h4 class='list-group-item-heading'>" + asset.name.escapeHTML() + "</h4>";
            rows += "<p class='list-group-item-text'><span>" + $.t('quantity') + "</span>: " + krs.formatQuantity(ownsQuantityQNT, asset.decimals) + "</p>";
            rows += "</a>";
        }

        var exchangeSidebar = $("#asset_exchange_sidebar");
        var active = exchangeSidebar.find("a.active");
        if (active.length) {
            active = active.data("asset");
        } else {
            active = false;
        }

        assetExchangeSidebarContent.empty().append(rows);
        var assetExchangeSidebarSearch = $("#asset_exchange_sidebar_search");
        assetExchangeSidebarSearch.show();

        if (isSearch) {
            if (active && assetSearch.indexOf(active) != -1) {
                //check if currently selected asset is in search results, if so keep it at that
                exchangeSidebar.find("a[data-asset=" + active + "]").addClass("active");
            } else if (assetSearch.length == 1) {
                //if there is only 1 search result, click it
                exchangeSidebar.find("a[data-asset=" + assetSearch[0] + "]").addClass("active").trigger("click");
            }
        } else if (active) {
            exchangeSidebar.find("a[data-asset=" + active + "]").addClass("active");
        }

        if (isSearch || assets.length >= 10) {
            assetExchangeSidebarSearch.show();
        } else {
            assetExchangeSidebarSearch.hide();
        }
        if (krs.getUrlParameter("page") && krs.getUrlParameter("page") == "asset_exchange" && krs.getUrlParameter("asset")) {

        } else {
            if (isSearch && assetSearch.length == 0) {
                $("#no_asset_search_results").show();
                $("#asset_details, #no_asset_selected, #no_assets_available").hide();
            } else if (!exchangeSidebar.find("a.active").length) {
                $("#no_asset_selected").show();
                $("#asset_details, #no_assets_available, #no_asset_search_results").hide();
            } else if (active) {
                $("#no_assets_available, #no_asset_selected, #no_asset_search_results").hide();
            }

            if (viewingAsset) {
                $("#asset_exchange_bookmark_this_asset").show();
            } else {
                $("#asset_exchange_bookmark_this_asset").hide();
            }
        }
        krs.pageLoaded(callback);
    };

    krs.incoming.asset_exchange = function () {
        var assetExchangeSidebar = $("#asset_exchange_sidebar");
        if (!viewingAsset) {
            //refresh active asset
            var $active = assetExchangeSidebar.find("a.active");

            if ($active.length) {
                $active.trigger("click", [{
                    "refresh": true
                }]);
            }
        } else {
            krs.loadAsset(viewingAsset, true);
        }

        //update assets owned (colored)
        assetExchangeSidebar.find("a.list-group-item.owns_asset").removeClass("owns_asset").addClass("not_owns_asset");
        if (krs.accountInfo.assetBalances) {
            $.each(krs.accountInfo.assetBalances, function (key, assetBalance) {
                if (assetBalance.balanceQNT != "0") {
                    $("#asset_exchange_sidebar").find("a.list-group-item[data-asset=" + assetBalance.asset + "]").addClass("owns_asset").removeClass("not_owns_asset");
                }
            });
        }
    };

    $("#asset_exchange_sidebar").on("click", "a", function (e, data) {
        e.preventDefault();
        currentAssetID = String($(this).data("asset")).escapeHTML();

        //refresh is true if data is refreshed automatically by the system (when a new block arrives)
        var refresh = (data && data.refresh);

        //clicked on a group
        if (!currentAssetID) {
            var group = $(this).data("groupname");
            var closed = $(this).data("closed");

            var $links;
            if (!group) {
                $links = $("#asset_exchange_sidebar").find("a.list-group-item-ungrouped");
            } else {
                $links = $("#asset_exchange_sidebar").find("a.list-group-item-grouped[data-groupname='" + group.escapeHTML() + "']");
            }
            if (!group) {
                group = "undefined";
            }
            if (closed) {
                var pos = closedGroups.indexOf(group);
                if (pos >= 0) {
                    closedGroups.splice(pos);
                }
                $(this).data("closed", "");
                $(this).find("i").removeClass("fa-angle-right").addClass("fa-angle-down");
                $links.show();
            } else {
                closedGroups.push(group);
                $(this).data("closed", true);
                $(this).find("i").removeClass("fa-angle-down").addClass("fa-angle-right");
                $links.hide();
            }
            krs.storageUpdate("data", {
                "contents": closedGroups.join("#")
            }, [{
                "id": "closed_groups"
            }]);
            return;
        }

        krs.storageSelect("assets", [{
            "asset": currentAssetID
        }], function (error, asset) {
            if (asset && asset.length && asset[0].asset == currentAssetID) {
                krs.loadAsset(asset[0], refresh);
            }
        });
    });

    krs.loadAsset = function (asset, refresh) {
        var assetId = asset.asset;
        currentAsset = asset;
        krs.currentSubPage = assetId;

        if (!refresh) {
            var assetExchangeSidebar = $("#asset_exchange_sidebar");
            assetExchangeSidebar.find("a.active").removeClass("active");
            assetExchangeSidebar.find("a[data-asset=" + assetId + "]").addClass("active");
            $("#no_asset_selected, #loading_asset_data, #no_assets_available, #no_asset_search_results").hide();
            //noinspection JSValidateTypes
            $("#asset_details").show().parent().animate({
                "scrollTop": 0
            }, 0);
            $("#asset_account").html(krs.getAccountLink(asset, "account"));
            $("#asset_id").html(krs.getTransactionLink(assetId));
            $("#asset_decimals").html(String(asset.decimals).escapeHTML());
            $("#asset_name").html(String(asset.name).escapeHTML());
            $("#asset_description").html(String(asset.description).autoLink());
            $(".asset_name").html(String(asset.name).escapeHTML());
            $("#sell_asset_button").data("asset", assetId);
            $("#buy_asset_button").data("asset", assetId);
            $("#view_asset_distribution_link").data("asset", assetId);
            $("#sell_asset_for_KPL").html($.t("sell_asset_for_KPL", {
                "assetName": String(asset.name).escapeHTML()
            }));
            $("#buy_asset_with_KPL").html($.t("buy_asset_with_KPL", {
                "assetName": String(asset.name).escapeHTML()
            }));
            $("#sell_asset_price, #buy_asset_price").val("");
            $("#sell_asset_quantity, #sell_asset_total, #buy_asset_quantity, #buy_asset_total").val("0");

            var assetExchangeAskOrdersTable = $("#asset_exchange_ask_orders_table");
            var assetExchangeBidOrdersTable = $("#asset_exchange_bid_orders_table");
            var assetExchangeTradeHistoryTable = $("#asset_exchange_trade_history_table");
            assetExchangeAskOrdersTable.find("tbody").empty();
            assetExchangeBidOrdersTable.find("tbody").empty();
            assetExchangeTradeHistoryTable.find("tbody").empty();
            assetExchangeAskOrdersTable.parent().addClass("data-loading").removeClass("data-empty");
            assetExchangeBidOrdersTable.parent().addClass("data-loading").removeClass("data-empty");
            assetExchangeTradeHistoryTable.parent().addClass("data-loading").removeClass("data-empty");

            $(".data-loading img.loading").hide();

            setTimeout(function () {
                $(".data-loading img.loading").fadeIn(200);
            }, 200);

            var nrDuplicates = 0;
            $.each(assets, function (key, singleAsset) {
                if (String(singleAsset.name).toLowerCase() == String(asset.name).toLowerCase() && singleAsset.asset != assetId) {
                    nrDuplicates++;
                }
            });

            $("#asset_exchange_duplicates_warning").html($.t("asset_exchange_duplicates_warning", {
                "count": nrDuplicates
            }));

            krs.sendRequest("getAsset", {
                "asset": assetId
            }, function (response) {
                if (!response.errorCode) {
                    if (response.asset != asset.asset || response.account != asset.account || response.accountRS != asset.accountRS || response.decimals != asset.decimals || response.description != asset.description || response.name != asset.name) {
                        krs.storageDelete("assets", [{
                            "asset": asset.asset
                        }], function () {
                            setTimeout(function () {
                                krs.loadPage("asset_exchange");
                                $.growl($.t("invalid asset") + " " + asset.name, {
                                    "type": "danger"
                                });
                            }, 50);
                        });
                    }
                    $("#asset_quantity").html(krs.formatQuantity(response.quantityQNT, response.decimals));
                }
            });

            if (asset.viewingAsset) {
                $("#asset_exchange_bookmark_this_asset").show();
                viewingAsset = asset;
            } else {
                $("#asset_exchange_bookmark_this_asset").hide();
                viewingAsset = false;
            }
        }

        // Only asset issuers have the ability to pay dividends.
        if (asset.accountRS == krs.accountRS) {
            $("#dividend_payment_link").show();
        } else {
            $("#dividend_payment_link").hide();
        }

        if (krs.accountInfo.unconfirmedBalanceNQT == "0") {
            $("#your_KPL_balance").html("0");
            $("#buy_automatic_price").addClass("zero").removeClass("nonzero");
        } else {
            $("#your_KPL_balance").html(krs.formatAmount(krs.accountInfo.unconfirmedBalanceNQT));
            $("#buy_automatic_price").addClass("nonzero").removeClass("zero");
        }

        if (krs.accountInfo.unconfirmedAssetBalances) {
            for (var i = 0; i < krs.accountInfo.unconfirmedAssetBalances.length; i++) {
                var balance = krs.accountInfo.unconfirmedAssetBalances[i];
                if (balance.asset == assetId) {
                    currentAsset.yourBalanceQNT = balance.unconfirmedBalanceQNT;
                    $("#your_asset_balance").html(krs.formatQuantity(balance.unconfirmedBalanceQNT, currentAsset.decimals));
                    if (balance.unconfirmedBalanceQNT == "0") {
                        $("#sell_automatic_price").addClass("zero").removeClass("nonzero");
                    } else {
                        $("#sell_automatic_price").addClass("nonzero").removeClass("zero");
                    }
                    break;
                }
            }
        }

        if (!currentAsset.yourBalanceQNT) {
            currentAsset.yourBalanceQNT = "0";
            $("#your_asset_balance").html("0");
        }

        krs.loadAssetOrders("ask", assetId, refresh);
        krs.loadAssetOrders("bid", assetId, refresh);
        krs.getAssetTradeHistory(assetId, refresh);
        krs.getAssetDividendHistory(assetId, "asset_dividend");
    };

    function processOrders(orders, type, refresh) {
        if (orders.length) {
            var order;
            $("#" + (type == "ask" ? "sell" : "buy") + "_orders_count").html("(" + orders.length + (orders.length == 50 ? "+" : "") + ")");
            var rows = "";
            var sum = new BigInteger(String("0"));
            var quantityDecimals = krs.getNumberOfDecimals(orders, "quantityQNT", function(val) {
                return krs.formatQuantity(val.quantityQNT, currentAsset.decimals);
            });
            var priceDecimals = krs.getNumberOfDecimals(orders, "priceNQT", function(val) {
                return krs.formatOrderPricePerWholeQNT(val.priceNQT, currentAsset.decimals);
            });
            var amountDecimals = krs.getNumberOfDecimals(orders, "totalNQT", function(val) {
                return krs.formatAmount(krs.calculateOrderTotalNQT(val.quantityQNT, val.priceNQT));
            });
            for (var i = 0; i < orders.length; i++) {
                order = orders[i];
                order.priceNQT = new BigInteger(order.priceNQT);
                order.quantityQNT = new BigInteger(order.quantityQNT);
                order.totalNQT = new BigInteger(krs.calculateOrderTotalNQT(order.quantityQNT, order.priceNQT));
                sum = sum.add(order.totalNQT);
                if (i == 0 && !refresh) {
                    $("#" + (type == "ask" ? "buy" : "sell") + "_asset_price").val(krs.calculateOrderPricePerWholeQNT(order.priceNQT, currentAsset.decimals));
                }
                var statusIcon = krs.getTransactionStatusIcon(order);
                var className = (order.account == krs.account ? "your-order" : "");
                rows += "<tr class='" + className + "' data-transaction='" + String(order.order).escapeHTML() + "' data-quantity='" + order.quantityQNT.toString().escapeHTML() + "' data-price='" + order.priceNQT.toString().escapeHTML() + "'>" +
                    "<td>" + krs.getTransactionLink(order.order, statusIcon, true) + "</td>" +
                    "<td>" + krs.getAccountLink(order, "account", currentAsset.accountRS, "Asset Issuer") + "</td>" +
                    "<td class='numeric'>" + krs.formatQuantity(order.quantityQNT, currentAsset.decimals, false, quantityDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(order.priceNQT, currentAsset.decimals, priceDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatAmount(order.totalNQT, false, false, amountDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatAmount(sum, false, false, amountDecimals) + "</td>" +
                    "</tr>";
            }
            $("#asset_exchange_" + type + "_orders_table tbody").empty().append(rows);
        } else {
            $("#asset_exchange_" + type + "_orders_table tbody").empty();
            if (!refresh) {
                $("#" + (type == "ask" ? "buy" : "sell") + "_asset_price").val("0");
            }
            $("#" + (type == "ask" ? "sell" : "buy") + "_orders_count").html("");
        }
        krs.dataLoadFinished($("#asset_exchange_" + type + "_orders_table"), !refresh);
    }

    krs.loadAssetOrders = function (type, assetId, refresh) {
        type = type.toLowerCase();
        var params = {
            "asset": assetId,
            "firstIndex": 0,
            "lastIndex": 25
        };
        async.parallel([
                function(callback) {
                    params["showExpectedCancellations"] = "true";
                    krs.sendRequest("get" + type.capitalize() + "Orders+" + assetId, params, function (response) {
                        var orders = response[type + "Orders"];
                        if (!orders) {
                            orders = [];
                        }
                        callback(null, orders);
                    })
                },
                function(callback) {
                    krs.sendRequest("getExpected" + type.capitalize() + "Orders+" + assetId, params, function (response) {
                        var orders = response[type + "Orders"];
                        if (!orders) {
                            orders = [];
                        }
                        callback(null, orders);
                    })
                }
            ],
            // invoked when both the requests above has completed
            // the results array contains both order lists
            function(err, results) {
                if (err) {
                    krs.logConsole(err);
                    return;
                }
                var orders = results[0].concat(results[1]);
                orders.sort(function (a, b) {
                    if (type == "ask") {
                        return a.priceNQT - b.priceNQT;
                    } else {
                        return b.priceNQT - a.priceNQT;
                    }
                });
                processOrders(orders, type, refresh);
            });
    };

    krs.getAssetDividendHistory = function (assetId, table) {
        var assetExchangeDividendHistoryTable = $("#" + table + "table");
        assetExchangeDividendHistoryTable.find("tbody").empty();
        assetExchangeDividendHistoryTable.parent().addClass("data-loading").removeClass("data-empty");
        var options = {
            "asset": assetId
        };
        var view = krs.simpleview.get(table, {
            errorMessage: null,
            isLoading: true,
            isEmpty: false,
            data: []
        });
        krs.sendRequest("getAssetDividends+", options, function (response) {
            var dividends = response.dividends;
            var amountDecimals = krs.getNumberOfDecimals(dividends, "totalDividend", function(val) {
                return krs.formatAmount(val.totalDividend);
            });
            var accountsDecimals = krs.getNumberOfDecimals(dividends, "numberOfAccounts", function(val) {
                return krs.formatAmount(val.numberOfAccounts);
            });
            var amountNQTPerQNTDecimals = krs.getNumberOfDecimals(dividends, "amountNQTPerQNT", function(val) {
                return krs.formatOrderPricePerWholeQNT(val.amountNQTPerQNT, currentAsset.decimals);
            });
            for (var i = 0; i < dividends.length; i++) {
                var dividend = dividends[i];
                dividend.numberOfAccounts = new BigInteger(dividend.numberOfAccounts.toString());
                dividend.amountNQTPerQNT = new BigInteger(dividend.amountNQTPerQNT);
                dividend.totalDividend = new BigInteger(dividend.totalDividend);
                view.data.push({
                    "timestamp": krs.getTransactionLink(dividend.assetDividend, krs.formatTimestamp(dividend.timestamp)),
                    "dividend_height": String(dividend.dividendHeight).escapeHTML(),
                    "total": krs.formatAmount(dividend.totalDividend, false, false, amountDecimals),
                    "accounts": krs.formatQuantity(dividend.numberOfAccounts, false, false, accountsDecimals),
                    "amount_per_share": krs.formatOrderPricePerWholeQNT(dividend.amountNQTPerQNT, currentAsset.decimals, amountNQTPerQNTDecimals)
                })
            }
            view.render({
                isLoading: false,
                isEmpty: view.data.length == 0
            });
            krs.pageLoaded();
        });
    };

    krs.getAssetTradeHistory = function (assetId, refresh) {
        var options = {
            "asset": assetId,
            "firstIndex": 0,
            "lastIndex": 50
        };

        if (assetTradeHistoryType == "you") {
            options["account"] = krs.accountRS;
        }

        krs.sendRequest("getTrades+" + assetId, options, function (response) {
            var exchangeTradeHistoryTable = $("#asset_exchange_trade_history_table");
            if (response.trades && response.trades.length) {
                var trades = response.trades;
                var rows = "";
                var quantityDecimals = krs.getNumberOfDecimals(trades, "quantityQNT", function(val) {
                    return krs.formatQuantity(val.quantityQNT, currentAsset.decimals);
                });
                var priceDecimals = krs.getNumberOfDecimals(trades, "priceNQT", function(val) {
                    return krs.formatOrderPricePerWholeQNT(val.priceNQT, currentAsset.decimals);
                });
                var amountDecimals = krs.getNumberOfDecimals(trades, "sum", function(val) {
                    return krs.formatAmount(krs.calculateOrderTotalNQT(val.quantityQNT, val.priceNQT));
                });
                for (var i = 0; i < trades.length; i++) {
                    var trade = trades[i];
                    trade.priceNQT = new BigInteger(trade.priceNQT);
                    trade.quantityQNT = new BigInteger(trade.quantityQNT);
                    trade.totalNQT = new BigInteger(krs.calculateOrderTotalNQT(trade.priceNQT, trade.quantityQNT));
                    rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(trade.bidOrder, krs.formatTimestamp(trade.timestamp)) + "</td>" +
                        "<td>" + $.t(trade.tradeType) + "</td>" +
                        "<td class='numeric'>" + krs.formatQuantity(trade.quantityQNT, currentAsset.decimals, false, quantityDecimals) + "</td>" +
                        "<td class='asset_price numeric'>" + krs.formatOrderPricePerWholeQNT(trade.priceNQT, currentAsset.decimals, priceDecimals) + "</td>" +
                        "<td style='text-align:right;color:";
                    if (trade.buyer == krs.account && trade.buyer != trade.seller) {
                        rows += "red";
                    } else if (trade.seller == krs.account && trade.buyer != trade.seller) {
                        rows += "green";
                    } else {
                        rows += "black";
                    }
                    rows += "'>" + krs.formatAmount(trade.totalNQT, false, false, amountDecimals) + "</td>" +
                        "<td>" + krs.getAccountLink(trade, "buyer", currentAsset.accountRS, "Asset Issuer") + "</td>" +
                        "<td>" + krs.getAccountLink(trade, "seller", currentAsset.accountRS, "Asset Issuer") + "</td>" +
                        "</tr>";
                }
                exchangeTradeHistoryTable.find("tbody").empty().append(rows);
                krs.dataLoadFinished(exchangeTradeHistoryTable, !refresh);
            } else {
                exchangeTradeHistoryTable.find("tbody").empty();
                krs.dataLoadFinished(exchangeTradeHistoryTable, !refresh);
            }
        });
    };

    $("#asset_exchange_trade_history_type").find(".btn").click(function (e) {
        e.preventDefault();
        assetTradeHistoryType = $(this).data("type");
        krs.getAssetTradeHistory(currentAsset.asset, true);
    });

    var assetExchangeSearch = $("#asset_exchange_search");
    assetExchangeSearch.on("submit", function (e) {
        e.preventDefault();
        $("#asset_exchange_search").find("input[name=q]").trigger("input");
    });

    assetExchangeSearch.find("input[name=q]").on("input", function () {
        var input = $.trim($(this).val()).toLowerCase();
        if (!input) {
            assetSearch = false;
            krs.loadAssetExchangeSidebar();
            $("#asset_exchange_clear_search").hide();
        } else {
            assetSearch = [];
            if (/KPL\-/i.test(input)) {
                $.each(assets, function (key, asset) {
                    if (asset.accountRS.toLowerCase() == input || asset.accountRS.toLowerCase().indexOf(input) !== -1) {
                        assetSearch.push(asset.asset);
                    }
                });
            } else {
                $.each(assets, function (key, asset) {
                    if (asset.account == input || asset.asset == input || asset.name.toLowerCase().indexOf(input) !== -1) {
                        assetSearch.push(asset.asset);
                    }
                });
            }

            krs.loadAssetExchangeSidebar();
            $("#asset_exchange_clear_search").show();
            $("#asset_exchange_show_type").hide();
        }
    });

    $("#asset_exchange_clear_search").on("click", function () {
        var assetExchangeSearch = $("#asset_exchange_search");
        assetExchangeSearch.find("input[name=q]").val("");
        assetExchangeSearch.trigger("submit");
    });

    $("#buy_asset_box .box-header, #sell_asset_box .box-header").click(function (e) {
        e.preventDefault();
        //Find the box parent
        var box = $(this).parents(".box").first();
        //Find the body and the footer
        var bf = box.find(".box-body, .box-footer");
        if (!box.hasClass("collapsed-box")) {
            box.addClass("collapsed-box");
            $(this).find(".btn i.fa").removeClass("fa-minus").addClass("fa-plus");
            bf.slideUp();
        } else {
            box.removeClass("collapsed-box");
            bf.slideDown();
            $(this).find(".btn i.fa").removeClass("fa-plus").addClass("fa-minus");
        }
    });

    $("#asset_exchange_bid_orders_table tbody, #asset_exchange_ask_orders_table tbody").on("click", "td", function (e) {
        var $target = $(e.target);
        var targetClass = $target.prop("class");
        if ($target.prop("tagName").toLowerCase() == "a" || (targetClass && targetClass.indexOf("fa") == 0)) {
            return;
        }

        var type = ($target.closest("table").attr("id") == "asset_exchange_bid_orders_table" ? "sell" : "buy");
        var $tr = $target.closest("tr");
        try {
            var priceNQT = new BigInteger(String($tr.data("price")));
            var quantityQNT = new BigInteger(String($tr.data("quantity")));
            var totalNQT = new BigInteger(krs.calculateOrderTotalNQT(quantityQNT, priceNQT));

            $("#" + type + "_asset_price").val(krs.calculateOrderPricePerWholeQNT(priceNQT, currentAsset.decimals));
            $("#" + type + "_asset_quantity").val(krs.convertToQNTf(quantityQNT, currentAsset.decimals));
            $("#" + type + "_asset_total").val(krs.convertToKPL(totalNQT));
        } catch (err) {
            return;
        }

        if (type == "buy") {
            try {
                var balanceNQT = new BigInteger(krs.accountInfo.unconfirmedBalanceNQT);
            } catch (err) {
                return;
            }

            if (totalNQT.compareTo(balanceNQT) > 0) {
                $("#" + type + "_asset_total").css({
                    "background": "#ED4348",
                    "color": "white"
                });
            } else {
                $("#" + type + "_asset_total").css({
                    "background": "",
                    "color": ""
                });
            }
        }

        var box = $("#" + type + "_asset_box");
        if (box.hasClass("collapsed-box")) {
            box.removeClass("collapsed-box");
            box.find(".box-body").slideDown();
            $("#" + type + "_asset_box .box-header").find(".btn i.fa").removeClass("fa-plus").addClass("fa-minus");
        }
    });

    $("#sell_automatic_price, #buy_automatic_price").on("click", function () {
        try {
            var type = ($(this).attr("id") == "sell_automatic_price" ? "sell" : "buy");
            var assetPrice = $("#" + type + "_asset_price");
            var price = new Big(krs.convertToNQT(String(assetPrice.val())));
            var balanceNQT = new Big(krs.accountInfo.unconfirmedBalanceNQT);
            var maxQuantity = new Big(krs.convertToQNTf(currentAsset.quantityQNT, currentAsset.decimals));
            if (balanceNQT.cmp(new Big("0")) <= 0) {
                return;
            }

            if (price.cmp(new Big("0")) <= 0) {
                //get minimum price if no offers exist, based on asset decimals..
                price = new Big("" + Math.pow(10, currentAsset.decimals));
                assetPrice.val(krs.convertToKPL(price.toString()));
            }

            var quantity;
            if (type == "sell") {
                quantity = new Big(currentAsset.yourBalanceQNT ? krs.convertToQNTf(currentAsset.yourBalanceQNT, currentAsset.decimals) : "0");
            } else {
                quantity = new Big(krs.amountToPrecision(balanceNQT.div(price).toString(), currentAsset.decimals));
            }
            var total = quantity.times(price);

            //proposed quantity is bigger than available quantity
            if (type == "buy" && quantity.cmp(maxQuantity) == 1) {
                quantity = maxQuantity;
                total = quantity.times(price);
            }

            $("#" + type + "_asset_quantity").val(quantity.toString());
            var assetTotal = $("#" + type + "_asset_total");
            assetTotal.val(krs.convertToKPL(total.toString()));
            assetTotal.css({
                "background": "",
                "color": ""
            });
        } catch (err) {
            krs.logConsole(err.message);
        }
    });

    $("#buy_asset_quantity, #buy_asset_price, #sell_asset_quantity, #sell_asset_price").keydown(function (e) {
        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        var isQuantityField = /_quantity/i.test($(this).attr("id"));
        var decimals = currentAsset.decimals;
        var maxFractionLength = (isQuantityField ? decimals : 8 - decimals);
        krs.validateDecimals(maxFractionLength, charCode, $(this).val(), e);
    });

    //calculate preview price (calculated on every keypress)
    $("#sell_asset_quantity, #sell_asset_price, #buy_asset_quantity, #buy_asset_price").keyup(function () {
        var orderType = $(this).data("type").toLowerCase();
        try {
            var quantityQNT = new BigInteger(krs.convertToQNT(String($("#" + orderType + "_asset_quantity").val()), currentAsset.decimals));
            var priceNQT = new BigInteger(krs.calculatePricePerWholeQNT(krs.convertToNQT(String($("#" + orderType + "_asset_price").val())), currentAsset.decimals));

            if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
                $("#" + orderType + "_asset_total").val("0");
            } else {
                var total = krs.calculateOrderTotal(quantityQNT, priceNQT, currentAsset.decimals);
                $("#" + orderType + "_asset_total").val(total.toString());
            }
        } catch (err) {
            $("#" + orderType + "_asset_total").val("0");
        }
    });

    $("#asset_order_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var orderType = $invoker.data("type");
        var assetId = $invoker.data("asset");
        $("#asset_order_modal_button").html(orderType + " Asset").data("resetText", orderType + " Asset");
        $(".asset_order_modal_type").html(orderType);

        orderType = orderType.toLowerCase();
        try {
            var quantity = String($("#" + orderType + "_asset_quantity").val());
            var quantityQNT = new BigInteger(krs.convertToQNT(quantity, currentAsset.decimals));
            var priceNQT = new BigInteger(krs.calculatePricePerWholeQNT(krs.convertToNQT(String($("#" + orderType + "_asset_price").val())), currentAsset.decimals));
            var totalKPL = krs.formatAmount(krs.calculateOrderTotalNQT(quantityQNT, priceNQT, currentAsset.decimals), false, true);
        } catch (err) {
            $.growl($.t("error_invalid_input"), {
                "type": "danger"
            });
            return e.preventDefault();
        }

        if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
            $.growl($.t("error_amount_price_required"), {
                "type": "danger"
            });
            return e.preventDefault();
        }

        var priceNQTPerWholeQNT = priceNQT.multiply(new BigInteger("" + Math.pow(10, currentAsset.decimals)));
        var description;
        var tooltipTitle;
        if (orderType == "buy") {
            description = $.t("buy_order_description", {
                "quantity": krs.formatQuantity(quantityQNT, currentAsset.decimals, true),
                "asset_name": $("#asset_name").html().escapeHTML(),
                "kpl": krs.formatAmount(priceNQTPerWholeQNT)
            });
            tooltipTitle = $.t("buy_order_description_help", {
                "kpl": krs.formatAmount(priceNQTPerWholeQNT, false, true),
                "total_KPL": totalKPL
            });
        } else {
            description = $.t("sell_order_description", {
                "quantity": krs.formatQuantity(quantityQNT, currentAsset.decimals, true),
                "asset_name": $("#asset_name").html().escapeHTML(),
                "kpl": krs.formatAmount(priceNQTPerWholeQNT)
            });
            tooltipTitle = $.t("sell_order_description_help", {
                "kpl": krs.formatAmount(priceNQTPerWholeQNT, false, true),
                "total_KPL": totalKPL
            });
        }

        $("#asset_order_description").html(description);
        $("#asset_order_total").html(totalKPL + " KPL");

        var assetOrderTotalTooltip = $("#asset_order_total_tooltip");
        if (quantity != "1") {
            assetOrderTotalTooltip.show();
            assetOrderTotalTooltip.popover("destroy");
            assetOrderTotalTooltip.data("content", tooltipTitle);
            assetOrderTotalTooltip.popover({
                "content": tooltipTitle,
                "trigger": "hover"
            });
        } else {
            assetOrderTotalTooltip.hide();
        }

        $("#asset_order_type").val((orderType == "buy" ? "placeBidOrder" : "placeAskOrder"));
        $("#asset_order_asset").val(assetId);
        $("#asset_order_quantity").val(quantityQNT.toString());
        $("#asset_order_price").val(priceNQT.toString());
    });

    krs.forms.orderAsset = function () {
        var orderType = $("#asset_order_type").val();
        return {
            "requestType": orderType,
            "successMessage": (orderType == "placeBidOrder" ? $.t("success_buy_order_asset") : $.t("success_sell_order_asset")),
            "errorMessage": $.t("error_order_asset")
        };
    };

    krs.forms.issueAsset = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        data.description = $.trim(data.description);
        if (!data.description) {
            return {
                "error": $.t("error_description_required")
            };
        } else if (!/^\d+$/.test(data.quantity)) {
            return {
                "error": $.t("error_whole_quantity")
            };
        } else {
            data.quantityQNT = String(data.quantity);
            if (data.decimals == "") {
                data.decimals = "0";
            }
            if (data.decimals > 0) {
                for (var i = 0; i < data.decimals; i++) {
                    data.quantityQNT += "0";
                }
            }
            delete data.quantity;
            return {
                "data": data
            };
        }
    };

    krs.getAssetAccounts = function (assetId, height, success, error) {
        krs.sendRequest("getAssetAccounts", {"asset": assetId, "height": height}, function (response) {
            if (response.errorCode) {
                error(response);
            } else {
                success(response);
            }
        }, false);
    };

    $("#asset_exchange_sidebar_group_context").on("click", "a", function (e) {
        e.preventDefault();
        var groupName = krs.selectedContext.data("groupname");
        var option = $(this).data("option");
        if (option == "change_group_name") {
            $("#asset_exchange_change_group_name_old_display").html(groupName.escapeHTML());
            $("#asset_exchange_change_group_name_old").val(groupName);
            $("#asset_exchange_change_group_name_new").val("");
            $("#asset_exchange_change_group_name_modal").modal("show");
        }
    });

    krs.forms.assetExchangeChangeGroupName = function () {
        var oldGroupName = $("#asset_exchange_change_group_name_old").val();
        var newGroupName = $("#asset_exchange_change_group_name_new").val();
        if (!newGroupName.match(/^[a-z0-9 ]+$/i)) {
            return {
                "error": $.t("error_group_name")
            };
        }

        krs.storageUpdate("assets", {
            "groupName": newGroupName
        }, [{
            "groupName": oldGroupName
        }], function () {
            setTimeout(function () {
                krs.loadPage("asset_exchange");
                $.growl($.t("success_group_name_update"), {
                    "type": "success"
                });
            }, 50);
        });

        return {
            "stop": true
        };
    };

    $("#asset_exchange_sidebar_context").on("click", "a", function (e) {
        e.preventDefault();
        var assetId = krs.selectedContext.data("asset");
        var option = $(this).data("option");
        krs.closeContextMenu();
        if (option == "add_to_group") {
            $("#asset_exchange_group_asset").val(assetId);
            krs.storageSelect("assets", [{
                "asset": assetId
            }], function (error, asset) {
                asset = asset[0];
                $("#asset_exchange_group_title").html(String(asset.name).escapeHTML());
                krs.storageSelect("assets", [], function (error, assets) {
                    var groupNames = [];
                    $.each(assets, function (index, asset) {
                        if (asset.groupName && $.inArray(asset.groupName, groupNames) == -1) {
                            groupNames.push(asset.groupName);
                        }
                    });
                    groupNames.sort(function (a, b) {
                        if (a.toLowerCase() > b.toLowerCase()) {
                            return 1;
                        } else if (a.toLowerCase() < b.toLowerCase()) {
                            return -1;
                        } else {
                            return 0;
                        }
                    });

                    var groupSelect = $("#asset_exchange_group_group");
                    groupSelect.empty();
                    $.each(groupNames, function (index, groupName) {
                        var selectedAttr = (asset.groupName && asset.groupName.toLowerCase() == groupName.toLowerCase() ? "selected='selected'" : "");
                        groupSelect.append("<option value='" + groupName.escapeHTML() + "' " + selectedAttr + ">" + groupName.escapeHTML() + "</option>");
                    });
                    var selectedAttr = (!asset.groupName ? "selected='selected'" : "");
                    groupSelect.append("<option value='0' " + selectedAttr + ">None</option>");
                    groupSelect.append("<option value='-1'>New group</option>");
                    $("#asset_exchange_group_modal").modal("show");
                });
            });
        } else if (option == "remove_from_group") {
            krs.storageUpdate("assets", {
                "groupName": ""
            }, [{
                "asset": assetId
            }], function () {
                setTimeout(function () {
                    krs.loadPage("asset_exchange");
                    $.growl($.t("success_asset_group_removal"), {
                        "type": "success"
                    });
                }, 50);
            });
        } else if (option == "remove_from_bookmarks") {
            var ownsAsset = false;
            if (krs.accountInfo.unconfirmedAssetBalances) {
                $.each(krs.accountInfo.unconfirmedAssetBalances, function (key, assetBalance) {
                    if (assetBalance.asset == assetId) {
                        ownsAsset = true;
                        return false;
                    }
                });
            }

            if (ownsAsset) {
                $.growl($.t("error_owned_asset_no_removal"), {
                    "type": "danger"
                });
            } else {
                krs.storageDelete("assets", [{
                    "asset": assetId
                }], function () {
                    setTimeout(function () {
                        krs.loadPage("asset_exchange");
                        $.growl($.t("success_asset_bookmark_removal"), {
                            "type": "success"
                        });
                    }, 50);
                });
            }
        }
    });

    $("#asset_exchange_group_group").on("change", function () {
        var value = $(this).val();
        if (value == -1) {
            $("#asset_exchange_group_new_group_div").show();
        } else {
            $("#asset_exchange_group_new_group_div").hide();
        }
    });

    krs.forms.assetExchangeGroup = function () {
        var assetId = $("#asset_exchange_group_asset").val();
        var groupName = $("#asset_exchange_group_group").val();
        if (groupName == 0) {
            groupName = "";
        } else if (groupName == -1) {
            groupName = $("#asset_exchange_group_new_group").val();
        }

        krs.storageUpdate("assets", {
            "groupName": groupName
        }, [{
            "asset": assetId
        }], function () {
            setTimeout(function () {
                krs.loadPage("asset_exchange");
                if (!groupName) {
                    $.growl($.t("success_asset_group_removal"), {
                        "type": "success"
                    });
                } else {
                    $.growl($.t("success_asset_group_add"), {
                        "type": "success"
                    });
                }
            }, 50);
        });

        return {
            "stop": true
        };
    };

    $("#asset_exchange_group_modal").on("hidden.bs.modal", function () {
        $("#asset_exchange_group_new_group_div").val("").hide();
    });

    /* TRADE HISTORY PAGE */
    krs.pages.trade_history = function () {
        krs.sendRequest("getTrades+", {
            "account": krs.accountRS,
            "includeAssetInfo": true,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            if (response.trades && response.trades.length) {
                if (response.trades.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.trades.pop();
                }
                var trades = response.trades;
                var quantityDecimals = krs.getNumberOfDecimals(trades, "quantityQNT", function(val) {
                    return krs.formatQuantity(val.quantityQNT, val.decimals);
                });
                var priceDecimals = krs.getNumberOfDecimals(trades, "priceNQT", function(val) {
                    return krs.formatOrderPricePerWholeQNT(val.priceNQT, val.decimals);
                });
                var amountDecimals = krs.getNumberOfDecimals(trades, "totalNQT", function(val) {
                    return krs.formatAmount(krs.calculateOrderTotalNQT(val.quantityQNT, val.priceNQT));
                });
                var rows = "";
                for (var i = 0; i < trades.length; i++) {
                    var trade = trades[i];
                    trade.priceNQT = new BigInteger(trade.priceNQT);
                    trade.quantityQNT = new BigInteger(trade.quantityQNT);
                    trade.totalNQT = new BigInteger(krs.calculateOrderTotalNQT(trade.priceNQT, trade.quantityQNT));
                    var type = (trade.buyerRS == krs.accountRS ? "buy" : "sell");
                    rows += "<tr>" +
                        "<td><a href='#' data-goto-asset='" + String(trade.asset).escapeHTML() + "'>" + String(trade.name).escapeHTML() + "</a></td>" +
                        "<td>" + krs.formatTimestamp(trade.timestamp) + "</td>" +
                        "<td>" + $.t(trade.tradeType) + "</td>" +
                        "<td class='numeric'>" + krs.formatQuantity(trade.quantityQNT, trade.decimals, false, quantityDecimals) + "</td>" +
                        "<td class='asset_price numeric'>" + krs.formatOrderPricePerWholeQNT(trade.priceNQT, trade.decimals, priceDecimals) + "</td>" +
                        "<td style='" + (type == "buy" ? "color:red" : "color:green") + "' class='numeric'>" + krs.formatAmount(trade.totalNQT, false, false, amountDecimals) + "</td>" +
                        "<td>" + krs.getAccountLink(trade, "buyer") + "</td>" +
                        "<td>" + krs.getAccountLink(trade, "seller") + "</td>" +
                        "</tr>";
                }
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        });
    };

    /* TRANSFER HISTORY PAGE */
    krs.pages.transfer_history = function () {
        krs.sendRequest("getAssetTransfers+", {
            "account": krs.accountRS,
            "includeAssetInfo": true,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            if (response.transfers && response.transfers.length) {
                if (response.transfers.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.transfers.pop();
                }
                var transfers = response.transfers;
                var quantityDecimals = krs.getNumberOfDecimals(transfers, "quantityQNT", function(val) {
                    return krs.formatQuantity(val.quantityQNT, val.decimals);
                });
                var rows = "";
                for (var i = 0; i < transfers.length; i++) {
                    var transfer = transfers[i];
                    transfer.quantityQNT = new BigInteger(transfer.quantityQNT);
                    var type = (transfer.recipientRS == krs.accountRS ? "receive" : "send");
                    rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(transfer.assetTransfer) + "</td>" +
                        "<td><a href='#' data-goto-asset='" + String(transfer.asset).escapeHTML() + "'>" + String(transfer.name).escapeHTML() + "</a></td>" +
                        "<td>" + krs.formatTimestamp(transfer.timestamp) + "</td>" +
                        "<td style='" + (type == "receive" ? "color:green" : "color:red") + "' class='numeric'>" + krs.formatQuantity(transfer.quantityQNT, transfer.decimals, false, quantityDecimals) + "</td>" +
                        "<td>" + krs.getAccountLink(transfer, "recipient") + "</td>" +
                        "<td>" + krs.getAccountLink(transfer, "sender") + "</td>" +
                        "</tr>";
                }
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        });
    };

    /* DELETES HISTORY PAGE */
    krs.pages.deletes_history = function () {
        krs.sendRequest("getAssetDeletes+", {
            "account": krs.accountRS,
            "includeAssetInfo": true,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            if (response.deletes && response.deletes.length) {
                if (response.deletes.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.deletes.pop();
                }
                var deletes = response.deletes;
                var quantityDecimals = krs.getNumberOfDecimals(deletes, "quantityQNT", function(val) {
                    return krs.formatQuantity(val.quantityQNT, val.decimals);
                });
                var rows = "";
                for (var i = 0; i < deletes.length; i++) {
                    deletes[i].quantityQNT = new BigInteger(deletes[i].quantityQNT);
                    rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(deletes[i].assetDelete) + "</td>" +
                        "<td><a href='#' data-goto-asset='" + String(deletes[i].asset).escapeHTML() + "'>" + String(deletes[i].name).escapeHTML() + "</a></td>" +
                        "<td>" + krs.formatTimestamp(deletes[i].timestamp) + "</td>" +
                        "<td class='numeric'>" + krs.formatQuantity(deletes[i].quantityQNT, deletes[i].decimals, false, quantityDecimals) + "</td>" +
                        "</tr>";
                }
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        });
    };

    /* MY ASSETS PAGE */
    krs.pages.my_assets = function () {
        if (krs.accountInfo.assetBalances && krs.accountInfo.assetBalances.length) {
            var result = {
                "assets": [],
                "bid_orders": {},
                "ask_orders": {}
            };
            var count = {
                "total_assets": krs.accountInfo.assetBalances.length,
                "assets": 0,
                "ignored_assets": 0,
                "ask_orders": 0,
                "bid_orders": 0
            };

            for (var i = 0; i < krs.accountInfo.assetBalances.length; i++) {
                if (krs.accountInfo.assetBalances[i].balanceQNT == "0") {
                    count.ignored_assets++;
                    if (krs.checkMyAssetsPageLoaded(count)) {
                        krs.myAssetsPageLoaded(result);
                    }
                    continue;
                }

                krs.sendRequest("getAskOrders+", {
                    "asset": krs.accountInfo.assetBalances[i].asset,
                    "firstIndex": 0,
                    "lastIndex": 1
                }, function (response, input) {
                    if (krs.currentPage != "my_assets") {
                        return;
                    }

                    if (response.askOrders && response.askOrders.length) {
                        result.ask_orders[input.asset] = new BigInteger(response.askOrders[0].priceNQT);
                    } else {
                        result.ask_orders[input.asset] = -1;
                    }

                    count.ask_orders++;
                    if (krs.checkMyAssetsPageLoaded(count)) {
                        krs.myAssetsPageLoaded(result);
                    }
                });

                krs.sendRequest("getBidOrders+", {
                    "asset": krs.accountInfo.assetBalances[i].asset,
                    "firstIndex": 0,
                    "lastIndex": 1
                }, function (response, input) {
                    if (krs.currentPage != "my_assets") {
                        return;
                    }

                    if (response.bidOrders && response.bidOrders.length) {
                        result.bid_orders[input.asset] = new BigInteger(response.bidOrders[0].priceNQT);
                    } else {
                        result.bid_orders[input.asset] = -1;
                    }

                    count.bid_orders++;

                    if (krs.checkMyAssetsPageLoaded(count)) {
                        krs.myAssetsPageLoaded(result);
                    }
                });

                krs.sendRequest("getAsset+", {
                    "asset": krs.accountInfo.assetBalances[i].asset,
                    "_extra": {
                        "balanceQNT": krs.accountInfo.assetBalances[i].balanceQNT
                    }
                }, function (asset, input) {
                    if (krs.currentPage != "my_assets") {
                        return;
                    }

                    asset.asset = input.asset;
                    asset.balanceQNT = new BigInteger(input["_extra"].balanceQNT);
                    asset.quantityQNT = new BigInteger(asset.quantityQNT);
                    asset.ask_orders = result.ask_orders[asset.asset];
                    asset.bid_orders = result.bid_orders[asset.asset];

                    result.assets[count.assets] = asset;
                    count.assets++;

                    if (krs.checkMyAssetsPageLoaded(count)) {
                        krs.myAssetsPageLoaded(result);
                    }
                });
            }
        } else {
            krs.dataLoaded();
        }
    };

    krs.checkMyAssetsPageLoaded = function (count) {
        return count.assets + count.ignored_assets == count.total_assets && count.assets == count.ask_orders && count.assets == count.bid_orders;
    };

    krs.myAssetsPageLoaded = function (result) {
        var rows = "";
        result.assets.sort(function (a, b) {
            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                return 1;
            } else if (a.name.toLowerCase() < b.name.toLowerCase()) {
                return -1;
            } else {
                return 0;
            }
        });
        var quantityDecimals = krs.getNumberOfDecimals(result.assets, "balanceQNT", function(asset) {
            return krs.formatQuantity(asset.balanceQNT, asset.decimals);
        });
        var totalDecimals = krs.getNumberOfDecimals(result.assets, "quantityQNT", function(asset) {
            return krs.formatQuantity(asset.quantityQNT, asset.decimals);
        });
        var askDecimals = krs.getNumberOfDecimals(result.assets, "ask", function(asset) {
            if (!asset.ask_orders || asset.ask_orders == -1) {
                return "";
            }
            return krs.formatOrderPricePerWholeQNT(asset.ask_orders, asset.decimals);
        });
        var bidDecimals = krs.getNumberOfDecimals(result.assets, "bid", function(asset) {
            if (!asset.bid_orders || asset.bid_orders == -1) {
                return "";
            }
            return krs.formatOrderPricePerWholeQNT(asset.bid_orders, asset.decimals);
        });
        var valueDecimals = krs.getNumberOfDecimals(result.assets, "bid", function(asset) {
            if (!asset.bid_orders || asset.bid_orders == -1) {
                return "";
            }
            var totalNQT = new BigInteger(krs.calculateOrderTotalNQT(asset.balanceQNT, asset.bid_orders));
            return krs.formatAmount(totalNQT);
        });
        for (var i = 0; i < result.assets.length; i++) {
            var asset = result.assets[i];
            var lowestAskOrder = result.ask_orders[asset.asset];
            var highestBidOrder = result.bid_orders[asset.asset];
            var percentageAsset = krs.calculatePercentage(asset.balanceQNT, asset.quantityQNT);

            if (highestBidOrder != -1) {
                var totalNQT = new BigInteger(krs.calculateOrderTotalNQT(asset.balanceQNT, highestBidOrder));
            }
            rows += "<tr data-asset='" + String(asset.asset).escapeHTML() + "'>" +
                "<td><a href='#' data-goto-asset='" + String(asset.asset).escapeHTML() + "'>" + String(asset.name).escapeHTML() + "</a></td>" +
                "<td class='quantity numeric'>" + krs.formatQuantity(asset.balanceQNT, asset.decimals, false, quantityDecimals) + "</td>" +
                "<td class='numeric'>" + krs.formatQuantity(asset.quantityQNT, asset.decimals, false, totalDecimals) + "</td>" +
                "<td class='numeric'>" + percentageAsset + "%</td>" +
                "<td class='numeric'>" + (lowestAskOrder != -1 ? krs.formatOrderPricePerWholeQNT(lowestAskOrder, asset.decimals, askDecimals) : "") + "</td>" +
                "<td class='numeric'>" + (highestBidOrder != -1 ? krs.formatOrderPricePerWholeQNT(highestBidOrder, asset.decimals, bidDecimals) : "") + "</td>" +
                "<td class='numeric'>" + (highestBidOrder != -1 ? krs.formatAmount(totalNQT, false, false, valueDecimals) : "") + "</td>" +
                "<td>" +
                "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#transfer_asset_modal' data-asset='" + String(asset.asset).escapeHTML() + "' data-name='" + String(asset.name).escapeHTML() + "' data-decimals='" + String(asset.decimals).escapeHTML() + "' data-action='transfer_asset'>" + $.t("transfer") + "</a>" +
                "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#transfer_asset_modal' data-asset='" + String(asset.asset).escapeHTML() + "' data-name='" + String(asset.name).escapeHTML() + "' data-decimals='" + String(asset.decimals).escapeHTML() + "' data-action='delete_shares'>" + $.t("delete_shares") + "</a>" +
                "</td>" +
                "</tr>";
        }
        krs.dataLoaded(rows);
    };

    krs.incoming.my_assets = function () {
        krs.loadPage("my_assets");
    };

    var assetDistributionModal = $("#asset_distribution_modal");
    assetDistributionModal.on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var assetId = $invoker.data("asset");
        krs.sendRequest("getAssetAccounts", {
            "asset": assetId
        }, function (response) {
            var rows = "";
            if (response.accountAssets) {
                response.accountAssets.sort(function (a, b) {
                    return new BigInteger(b.quantityQNT).compareTo(new BigInteger(a.quantityQNT));
                });

                for (var i = 0; i < response.accountAssets.length; i++) {
                    var account = response.accountAssets[i];
                    var percentageAsset = krs.calculatePercentage(account.quantityQNT, currentAsset.quantityQNT);
                    rows += "<tr><td>" + krs.getAccountLink(account, "account", currentAsset.accountRS, "Asset Issuer") + "</td><td>" + krs.formatQuantity(account.quantityQNT, currentAsset.decimals) + "</td><td>" + percentageAsset + "%</td></tr>";
                }
            }
            var assetDistributionTable = $("#asset_distribution_table");
            assetDistributionTable.find("tbody").empty().append(rows);
            krs.dataLoadFinished(assetDistributionTable);
        });
    });

    assetDistributionModal.on("hidden.bs.modal", function () {
        var assetDistributionTable = $("#asset_distribution_table");
        assetDistributionTable.find("tbody").empty();
        assetDistributionTable.parent().addClass("data-loading");
    });

    $("#transfer_asset_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var assetId = $invoker.data("asset");
        var assetName = $invoker.data("name");
        var decimals = $invoker.data("decimals");
        var action = $invoker.data("action");

        $("#transfer_asset_asset").val(assetId);
        $("#transfer_asset_decimals").val(decimals);
        $("#transfer_asset_action").val(action);
        $("#transfer_asset_name, #transfer_asset_quantity_name").html(String(assetName).escapeHTML());
        $("#transfer_asset_title").html($.t(action));
        $("#transfer_asset_button").html($.t(action));
        if (action == "transfer_asset") {
            $("#transfer_asset_recipient_container").show();
            $("#transfer_asset_request_type").val("transferAsset");
        } else if (action == "delete_shares") {
            $("#transfer_asset_recipient_container").hide();
            $("#transfer_asset_request_type").val("deleteAssetShares");
        }

        var confirmedBalance = 0;
        var unconfirmedBalance = 0;
        if (krs.accountInfo.assetBalances) {
            $.each(krs.accountInfo.assetBalances, function (key, assetBalance) {
                if (assetBalance.asset == assetId) {
                    confirmedBalance = assetBalance.balanceQNT;
                    return false;
                }
            });
        }

        if (krs.accountInfo.unconfirmedAssetBalances) {
            $.each(krs.accountInfo.unconfirmedAssetBalances, function (key, assetBalance) {
                if (assetBalance.asset == assetId) {
                    unconfirmedBalance = assetBalance.unconfirmedBalanceQNT;
                    return false;
                }
            });
        }

        var availableAssetsMessage = "";
        if (confirmedBalance == unconfirmedBalance) {
            availableAssetsMessage = " - " + $.t("available_qty", {
                    "qty": krs.formatQuantity(confirmedBalance, decimals)
                });
        } else {
            availableAssetsMessage = " - " + $.t("available_qty", {
                    "qty": krs.formatQuantity(unconfirmedBalance, decimals)
                }) + " (" + krs.formatQuantity(confirmedBalance, decimals) + " " + $.t("total_lowercase") + ")";
        }
        $("#transfer_asset_available").html(availableAssetsMessage);
    });

    krs.forms.transferAsset = function ($modal) {
        return transferOrDeleteShares($modal);
    };

    krs.forms.deleteAssetShares = function ($modal) {
        return transferOrDeleteShares($modal);
    };

    function transferOrDeleteShares($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        if (!data.quantity) {
            return {
                "error": $.t("error_not_specified", {
                    "name": krs.getTranslatedFieldName("quantity").toLowerCase()
                }).capitalize()
            };
        }

        if (!krs.showedFormWarning) {
            if (krs.settings["asset_transfer_warning"] && krs.settings["asset_transfer_warning"] != 0) {
                if (new Big(data.quantity).cmp(new Big(krs.settings["asset_transfer_warning"])) > 0) {
                    krs.showedFormWarning = true;
                    return {
                        "error": $.t("error_max_asset_transfer_warning", {
                            "qty": String(krs.settings["asset_transfer_warning"]).escapeHTML()
                        })
                    };
                }
            }
        }

        try {
            data.quantityQNT = krs.convertToQNT(data.quantity, data.decimals);
        } catch (e) {
            return {
                "error": $.t("error_incorrect_quantity_plus", {
                    "err": e.escapeHTML()
                })
            };
        }

        delete data.quantity;
        delete data.decimals;
        if (!data.add_message) {
            delete data.add_message;
            delete data.message;
            delete data.encrypt_message;
            delete data.permanent_message;
        }

        if ($("#transfer_asset_action").val() == "delete_shares") {
            delete data.recipient;
            delete data.recipientPublicKey;
        }
        return {
            "data": data
        };
    }

    krs.forms.transferAssetComplete = function () {
        krs.loadPage("my_assets");
    };

    $("body").on("click", "a[data-goto-asset]", function (e) {
        e.preventDefault();
        var $visible_modal = $(".modal.in");
        if ($visible_modal.length) {
            $visible_modal.modal("hide");
        }
        viewingAsset = true;
        krs.goToAsset($(this).data("goto-asset"));
    });

    krs.goToAsset = function (asset) {
        assetSearch = false;
        $("#asset_exchange_sidebar_search").find("input[name=q]").val("");
        $("#asset_exchange_clear_search").hide();
        $("#asset_exchange_sidebar").find("a.list-group-item.active").removeClass("active");
        $("#no_asset_selected, #asset_details, #no_assets_available, #no_asset_search_results").hide();
        $("#loading_asset_data").show();
        $("ul.sidebar-menu a[data-page=asset_exchange]").last().trigger("click", [{
            callback: function () {
                var assetLink = $("#asset_exchange_sidebar").find("a[data-asset=" + asset + "]");
                if (assetLink.length) {
                    assetLink.click();
                } else {
                    krs.sendRequest("getAsset", {
                        "asset": asset
                    }, function (response) {
                        if (!response.errorCode) {
                            krs.loadAssetExchangeSidebar(function () {
                                response.groupName = "";
                                response.viewingAsset = true;
                                krs.loadAsset(response);
                            });
                        } else {
                            $.growl($.t("error_asset_not_found"), {
                                "type": "danger"
                            });
                        }
                    });
                }
            }
        }]);
    };

    /* OPEN ORDERS PAGE */
    krs.pages.open_orders = function () {
        var loaded = 0;
        krs.getOpenOrders("ask", function () {
            loaded++;
            if (loaded == 2) {
                krs.pageLoaded();
            }
        });

        krs.getOpenOrders("bid", function () {
            loaded++;
            if (loaded == 2) {
                krs.pageLoaded();
            }
        });
    };

    krs.getOpenOrders = function (type, callback) {
        var uppercase = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        var lowercase = type.toLowerCase();
        var getAccountCurrentOrders = "getAccountCurrent" + uppercase + "Orders+";
        var accountOrders = lowercase + "Orders";

        krs.sendRequest(getAccountCurrentOrders, {
            "account": krs.account,
            "firstIndex": 0,
            "lastIndex": 100
        }, function (response) {
            if (response[accountOrders] && response[accountOrders].length) {
                var nrOrders = 0;
                for (var i = 0; i < response[accountOrders].length; i++) {
                    krs.sendRequest("getAsset+", {
                        "asset": response[accountOrders][i].asset,
                        "_extra": {
                            "id": i
                        }
                    }, function (asset, input) {
                        if (krs.currentPage != "open_orders") {
                            return;
                        }
                        response[accountOrders][input["_extra"].id].assetName = asset.name;
                        response[accountOrders][input["_extra"].id].decimals = asset.decimals;
                        nrOrders++;
                        if (nrOrders == response[accountOrders].length) {
                            krs.openOrdersLoaded(response[accountOrders], lowercase, callback);
                        }
                    });
                }
            } else {
                krs.openOrdersLoaded([], lowercase, callback);
            }
        });
    };

    krs.openOrdersLoaded = function (orders, type, callback) {
        var openOrdersTable = $("#open_" + type + "_orders_table");
        if (!orders.length) {
            $("#open_" + type + "_orders_table tbody").empty();
            krs.dataLoadFinished(openOrdersTable);
            callback();
            return;
        }

        orders.sort(function (a, b) {
            if (a.assetName.toLowerCase() > b.assetName.toLowerCase()) {
                return 1;
            } else if (a.assetName.toLowerCase() < b.assetName.toLowerCase()) {
                return -1;
            } else {
                if (a.quantity * a.price > b.quantity * b.price) {
                    return 1;
                } else if (a.quantity * a.price < b.quantity * b.price) {
                    return -1;
                } else {
                    return 0;
                }
            }
        });

        var rows = "";
        for (var i = 0; i < orders.length; i++) {
            var completeOrder = orders[i];
            completeOrder.priceNQT = new BigInteger(completeOrder.priceNQT);
            completeOrder.quantityQNT = new BigInteger(completeOrder.quantityQNT);
            completeOrder.totalNQT = new BigInteger(krs.calculateOrderTotalNQT(completeOrder.quantityQNT, completeOrder.priceNQT));
            rows += "<tr data-order='" + String(completeOrder.order).escapeHTML() + "'><td><a href='#' data-goto-asset='" + String(completeOrder.asset).escapeHTML() + "'>" + completeOrder.assetName.escapeHTML() + "</a></td><td>" + krs.formatQuantity(completeOrder.quantityQNT, completeOrder.decimals) + "</td><td>" + krs.formatOrderPricePerWholeQNT(completeOrder.priceNQT, completeOrder.decimals) + "</td><td>" + krs.formatAmount(completeOrder.totalNQT) + "</td><td class='cancel'><a href='#' data-toggle='modal' data-target='#cancel_order_modal' data-order='" + String(completeOrder.order).escapeHTML() + "' data-type='" + type + "'>" + $.t("cancel") + "</a></td></tr>";
        }
        openOrdersTable.find("tbody").empty().append(rows);
        krs.dataLoadFinished(openOrdersTable);
        callback();
    };

    krs.incoming.open_orders = function (transactions) {
        if (krs.hasTransactionUpdates(transactions)) {
            krs.loadPage("open_orders");
        }
    };

    $("#cancel_order_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var orderType = $invoker.data("type");
        var orderId = $invoker.data("order");
        if (orderType == "bid") {
            $("#cancel_order_type").val("cancelBidOrder");
        } else {
            $("#cancel_order_type").val("cancelAskOrder");
        }
        $("#cancel_order_order").val(orderId);
    });

    krs.forms.cancelOrder = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        var requestType = data.cancel_order_type;
        delete data.cancel_order_type;
        return {
            "data": data,
            "requestType": requestType
        };
    };

    krs.forms.cancelOrderComplete = function (response, data) {
        if (data.requestType == "cancelAskOrder") {
            $.growl($.t("success_cancel_sell_order"), {
                "type": "success"
            });
        } else {
            $.growl($.t("success_cancel_buy_order"), {
                "type": "success"
            });
        }
    };

    krs.buildApprovalRequestAssetNavi = function () {
        var $select = $('#approve_asset_select');
        $select.empty();
        var assetSelected = false;
        var $noneOption = $('<option value=""></option>');

        krs.sendRequest("getAccountAssets", {
            "account": krs.accountRS,
            "includeAssetInfo": true
        }, function (response) {
            if (response.accountAssets) {
                if (response.accountAssets.length > 0) {
                    $noneOption.html($.t('no_asset_selected_for_approval', 'No Asset Selected'));
                    $.each(response.accountAssets, function (key, asset) {
                        var idString = String(asset.asset);
                        var $option = $('<option value="' + idString + '">' + String(asset.name).escapeHTML() + '</option>');
                        if (idString == selectedApprovalAsset) {
                            $option.attr('selected', true);
                            assetSelected = true;
                        }
                        $option.appendTo($select);
                    });
                } else {
                    $noneOption.html($.t('account_has_no_assets', 'Account has no assets'));
                }
            } else {
                $noneOption.html($.t('no_connection'));
            }
            if (!selectedApprovalAsset || !assetSelected) {
                $noneOption.attr('selected', true);
            }
            $noneOption.prependTo($select);
        });
    };

    krs.pages.approval_requests_asset = function () {
        krs.buildApprovalRequestAssetNavi();
        if (selectedApprovalAsset != "") {
            var params = {
                "asset": selectedApprovalAsset,
                "withoutWhitelist": true,
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            };
            krs.sendRequest("getAssetPhasedTransactions", params, function (response) {
                var rows = "";

                if (response.transactions && response.transactions.length > 0) {
                    if (response.transactions.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.transactions.pop();
                    }
                    var decimals = krs.getTransactionsAmountDecimals(response.transactions);
                    for (var i = 0; i < response.transactions.length; i++) {
                        var t = response.transactions[i];
                        t.confirmed = true;
                        rows += krs.getTransactionRowHTML(t, ['approve'], decimals);
                    }
                } else {
                    $('#ar_asset_no_entries').html($.t('no_current_approval_requests', 'No current approval requests'));
                }
                krs.dataLoaded(rows);
                krs.addPhasingInfoToTransactionRows(response.transactions);
            });
        } else {
            $('#ar_asset_no_entries').html($.t('please_select_asset_for_approval', 'Please select an asset'));
            krs.dataLoaded();
        }
    };

    $('#approve_asset_select').on('change', function () {
        selectedApprovalAsset = $(this).find('option:selected').val();
        krs.loadPage("approval_requests_asset");
    });

    $("#issue_asset_modal").on("show.bs.modal", function () {
        $('#issue_asset_quantity, #issue_asset_decimals').prop("readonly", false);
    });

    $('#issue_asset_singleton').change(function () {
        var assetQuantity = $('#issue_asset_quantity');
        var assetDecimals = $('#issue_asset_decimals');
        if ($(this).is(":checked")) {
            assetQuantity.val("1");
            assetQuantity.prop("readonly", true);
            assetDecimals.val("0");
            assetDecimals.prop("readonly", true);
        } else {
            assetQuantity.prop("readonly", false);
            assetQuantity.val("");
            assetDecimals.prop("readonly", false);
            assetDecimals.val("0");
        }
    });

    krs.setup.asset_exchange = function () {
        var sidebarId = 'sidebar_asset_exchange';
        var options = {
            "id": sidebarId,
            "titleHTML": '<i class="fa fa-signal"></i><span data-i18n="asset_exchange">Asset Exchange</span>',
            "page": 'asset_exchange',
            "desiredPosition": 30,
            "depends": { tags: [ krs.constants.API_TAGS.AE ] }
        };
        krs.addTreeviewSidebarMenuItem(options);
        options = {
            "titleHTML": '<span data-i18n="asset_exchange">Asset Exchange</span>',
            "type": 'PAGE',
            "page": 'asset_exchange'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="trade_history">Trade History</span></a>',
            "type": 'PAGE',
            "page": 'trade_history'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="transfer_history">Transfer History</span>',
            "type": 'PAGE',
            "page": 'transfer_history'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="delete_history">Delete History</span>',
            "type": 'PAGE',
            "page": 'deletes_history'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="my_assets">My Assets</span></a>',
            "type": 'PAGE',
            "page": 'my_assets'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="open_orders">Open Orders</span>',
            "type": 'PAGE',
            "page": 'open_orders'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="approval_requests">Approval Requests</span>',
            "type": 'PAGE',
            "page": 'approval_requests_asset'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="issue_asset">Issue Asset</span>',
            "type": 'MODAL',
            "modalId": 'issue_asset_modal'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
    };

    return krs;
}(krs || {}, jQuery));