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
var krs = (function(krs, $, undefined) {
    krs.newlyCreatedAccount = false;

    krs.allowLoginViaEnter = function() {
        $("#login_account_other").keypress(function(e) {
            if (e.which == '13') {
                e.preventDefault();
                var account = $("#login_account_other").val();
                krs.login(false,account);
            }
        });
        $("#login_password").keypress(function(e) {
            if (e.which == '13') {
                e.preventDefault();
                var password = $("#login_password").val();
                krs.login(true,password);
            }
        });
    };

    krs.showLoginOrWelcomeScreen = function() {
        krs.showLoginScreen();
        /*
         if (localStorage.getItem("logged_in")) {
         krs.showLoginScreen();
         } else {
         krs.showWelcomeScreen();
         }
         */
    };

    krs.showLoginScreen = function() {
        $("#account_phrase_custom_panel, #account_phrase_generator_panel, #welcome_panel, #custom_passphrase_link").hide();
        $("#account_phrase_custom_panel").find(":input:not(:button):not([type=submit])").val("");
        $("#account_phrase_generator_panel").find(":input:not(:button):not([type=submit])").val("");
        $("#login_account_other").mask("KPL-****-****-****-*****");

        $("#login_panel").show();
        setTimeout(function() {
            $("#login_password").focus()
        }, 10);
    };

    krs.showWelcomeScreen = function() {
        $("#login_panel, #account_phrase_generator_panel, #account_phrase_custom_panel, #welcome_panel, #custom_passphrase_link").hide();
        $("#welcome_panel").show();
    };

    krs.registerUserDefinedAccount = function() {
        $("#account_phrase_generator_panel, #login_panel, #welcome_panel, #custom_passphrase_link").hide();
        $("#account_phrase_generator_panel").find(":input:not(:button):not([type=submit])").val("");
        var accountPhraseCustomPanel = $("#account_phrase_custom_panel");
        accountPhraseCustomPanel.find(":input:not(:button):not([type=submit])").val("");
        accountPhraseCustomPanel.show();
        $("#registration_password").focus();
    };

    krs.registerAccount = function() {
        $("#login_panel, #welcome_panel").hide();
        var accountPhraseGeneratorPanel = $("#account_phrase_generator_panel");
        accountPhraseGeneratorPanel.show();
        accountPhraseGeneratorPanel.find(".step_3 .callout").hide();

        var $loading = $("#account_phrase_generator_loading");
        var $loaded = $("#account_phrase_generator_loaded");

        //noinspection JSUnresolvedVariable
        if (window.crypto || window.msCrypto) {
            $loading.find("span.loading_text").html($.t("generating_passphrase_wait"));
        }

        $loading.show();
        $loaded.hide();

        if (typeof PassPhraseGenerator == "undefined") {
            $.when(
                $.getScript("js/crypto/passphrasegenerator.js")
            ).done(function() {
                $loading.hide();
                $loaded.show();

                PassPhraseGenerator.generatePassPhrase("#account_phrase_generator_panel");
            }).fail(function() {
                alert($.t("error_word_list"));
            });
        } else {
            $loading.hide();
            $loaded.show();

            PassPhraseGenerator.generatePassPhrase("#account_phrase_generator_panel");
        }
    };

    krs.verifyGeneratedPassphrase = function() {
        var accountPhraseGeneratorPanel = $("#account_phrase_generator_panel");
        var password = $.trim(accountPhraseGeneratorPanel.find(".step_3 textarea").val());

        if (password != PassPhraseGenerator.passPhrase) {
            accountPhraseGeneratorPanel.find(".step_3 .callout").show();
        } else {
            krs.newlyCreatedAccount = true;
            krs.login(true,password);
            PassPhraseGenerator.reset();
            accountPhraseGeneratorPanel.find("textarea").val("");
            accountPhraseGeneratorPanel.find(".step_3 .callout").hide();
        }
    };

    $("#account_phrase_custom_panel").find("form").submit(function(event) {
        event.preventDefault();

        var password = $("#registration_password").val();
        var repeat = $("#registration_password_repeat").val();

        var error = "";

        if (password.length < 35) {
            error = $.t("error_passphrase_length");
        } else if (password.length < 50 && (!password.match(/[A-Z]/) || !password.match(/[0-9]/))) {
            error = $.t("error_passphrase_strength");
        } else if (password != repeat) {
            error = $.t("error_passphrase_match");
        }

        if (error) {
            $("#account_phrase_custom_panel").find(".callout").first().removeClass("callout-info").addClass("callout-danger").html(error);
        } else {
            $("#registration_password, #registration_password_repeat").val("");
            krs.login(true,password);
        }
    });

    krs.listAccounts = function() {
        var loginAccount = $('#login_account');
        loginAccount.empty();
        if (krs.getStrItem("savedKPLAccounts") && krs.getStrItem("savedKPLAccounts") != ""){
            $('#login_account_container').show();
            $('#login_account_container_other').hide();
            var accounts = krs.getStrItem("savedKPLAccounts").split(";");
            $.each(accounts, function(index, account) {
                if (account != ''){
                    $('#login_account')
                        .append($("<li></li>")
                            .append($("<a></a>")
                                .attr("href","#")
                                .attr("style","display: inline-block;width: 360px;")
                                .attr("onClick","krs.login(false,'"+account+"')")
                                .text(account))
                            .append($('<button aria-hidden="true" data-dismiss="modal" class="close" type="button">×</button>')
                                .attr("onClick","krs.removeAccount('"+account+"')")
                                .attr("style","margin-right:5px"))
                        );
                }
            });
            var otherHTML = "<li><a href='#' style='display: inline-block;width: 380px;' ";
            otherHTML += "data-i18n='other'>Other</a></li>";
            var $otherHTML = $(otherHTML);
            $otherHTML.click(function() {
                $('#login_account_container').hide();
                $('#login_account_container_other').show();
            });
            $otherHTML.appendTo(loginAccount);
        }
        else{
            $('#login_account_container').hide();
            $('#login_account_container_other').show();
        }
    };

    krs.switchAccount = function(account) {
        // Reset security related state
        krs.resetEncryptionState();
        krs.setServerPassword(null);
        krs.rememberPassword = false;
        $("#remember_password").prop("checked", false);

        // Reset other functional state
        $("#account_balance, #account_balance_sidebar, #account_nr_assets, #account_assets_balance, #account_currencies_balance, #account_nr_currencies, #account_purchase_count, #account_pending_sale_count, #account_completed_sale_count, #account_message_count, #account_alias_count").html("0");
        $("#id_search").find("input[name=q]").val("");
        krs.resetAssetExchangeState();
        krs.resetPollsState();
        krs.resetMessagesState();
        krs.forgingStatus = krs.constants.UNKNOWN;
        krs.isAccountForging = false;
        krs.selectedContext = null;

        // Reset plugins state
        krs.activePlugins = false;
        krs.numRunningPlugins = 0;
        $.each(krs.plugins, function(pluginId) {
            krs.determinePluginLaunchStatus(pluginId);
        });

        // Return to the dashboard and notify the user
        krs.goToPage("dashboard");
        krs.login(false, account, function() {
            $.growl($.t("switched_to_account", { account: account }))
        }, true);
    };

    $("#loginButtons").on('click',function(e) {
        e.preventDefault();
        if ($(this).data( "login-type" ) == "password") {
            krs.listAccounts();
            $('#login_password').parent().hide();
            $('#remember_password_container').hide();
            $(this).html('<input type="hidden" name="loginType" id="accountLogin" value="account" autocomplete="off" /><i class="fa fa-male"></i>');
            $(this).data( "login-type","account");
        }
        else {
            $('#login_account_container').hide();
            $('#login_account_container_other').hide();
            $('#login_password').parent().show();
            $('#remember_password_container').show();
            $(this).html('<input type="hidden" name="loginType" id="accountLogin" value="passwordLogin" autocomplete="off" /><i class="fa fa-key"></i>');
            $(this).data( "login-type","password");
        }
    });

    krs.removeAccount = function(account) {
        var accounts = krs.getStrItem("savedKPLAccounts").replace(account+';','');
        if (accounts == '') {
            krs.removeItem('savedKPLAccounts');
        } else {
            krs.setStrItem("savedKPLAccounts", accounts);
        }
        krs.listAccounts();
    };

    // id can be either account id or passphrase
    krs.login = function(isPassphraseLogin, id, callback, isAccountSwitch) {
        if (isPassphraseLogin){
            var loginCheckPasswordLength = $("#login_check_password_length");
            if (!id.length) {
                $.growl($.t("error_passphrase_required_login"), {
                    "type": "danger",
                    "offset": 10
                });
                return;
            } else if (!krs.isTestNet && id.length < 12 && loginCheckPasswordLength.val() == 1) {
                loginCheckPasswordLength.val(0);
                var loginError = $("#login_error");
                loginError.find(".callout").html($.t("error_passphrase_login_length"));
                loginError.show();
                return;
            }

            $("#login_password, #registration_password, #registration_password_repeat").val("");
            loginCheckPasswordLength.val(1);
        }

        krs.sendRequest("getBlockchainStatus", {}, function(response) {
            if (response.errorCode) {
                $.growl($.t("error_server_connect"), {
                    "type": "danger",
                    "offset": 10
                });

                return;
            }

            krs.state = response;
            var accountRequest;
            var requestVariable;
            if (isPassphraseLogin) {
                accountRequest = "getAccountId";
                requestVariable = {secretPhrase: id};
            } else {
                accountRequest = "getAccount";
                requestVariable = {account: id};
            }

            //this is done locally..
            krs.sendRequest(accountRequest, requestVariable, function(response, data) {
                if (!response.errorCode) {
                    krs.account = String(response.account).escapeHTML();
                    krs.accountRS = String(response.accountRS).escapeHTML();
                    if (isPassphraseLogin) {
                        krs.publicKey = krs.getPublicKey(converters.stringToHexString(id));
                    } else {
                        krs.publicKey = String(response.publicKey).escapeHTML();
                    }
                }
                if (!isPassphraseLogin && response.errorCode == 5) {
                    krs.account = String(response.account).escapeHTML();
                    krs.accountRS = String(response.accountRS).escapeHTML();
                }
                if (!krs.account) {
                    $.growl($.t("error_find_account_id", { accountRS: (data && data.account ? String(data.account).escapeHTML() : "") }), {
                        "type": "danger",
                        "offset": 10
                    });
                    return;
                } else if (!krs.accountRS) {
                    $.growl($.t("error_generate_account_id"), {
                        "type": "danger",
                        "offset": 10
                    });
                    return;
                }

                krs.sendRequest("getAccountPublicKey", {
                    "account": krs.account
                }, function(response) {
                    if (response && response.publicKey && response.publicKey != krs.generatePublicKey(id) && isPassphraseLogin) {
                        $.growl($.t("error_account_taken"), {
                            "type": "danger",
                            "offset": 10
                        });
                        return;
                    }

                    var rememberPassword = $("#remember_password");
                    if (rememberPassword.is(":checked") && isPassphraseLogin) {
                        krs.rememberPassword = true;
                        rememberPassword.prop("checked", false);
                        krs.setPassword(id);
                        $(".secret_phrase, .show_secret_phrase").hide();
                        $(".hide_secret_phrase").show();
                    }
                    krs.disablePluginsDuringSession = $("#disable_all_plugins").is(":checked");
                    $("#sidebar_account_id").html(String(krs.accountRS).escapeHTML());
                    $("#sidebar_account_link").html(krs.getAccountLink(krs, "account", krs.accountRS, "details", false, "btn btn-default btn-xs"));
                    krs.sendRequest("getFxtQuantity", {
                        "account": krs.account
                    }, function(fxt) {
                        if (fxt.distributionEnd && fxt.distributionEnd < krs.lastBlockHeight) {
                            $("#sidebar_asset_distribution").hide();
                        }
                    });
                    if (krs.lastBlockHeight == 0 && krs.state.numberOfBlocks) {
                        krs.lastBlockHeight = krs.state.numberOfBlocks - 1;
                    }
                    $("#sidebar_block_link").html(krs.getBlockLink(krs.lastBlockHeight));

                    var passwordNotice = "";

                    if (id.length < 35 && isPassphraseLogin) {
                        passwordNotice = $.t("error_passphrase_length_secure");
                    } else if (isPassphraseLogin && id.length < 50 && (!id.match(/[A-Z]/) || !id.match(/[0-9]/))) {
                        passwordNotice = $.t("error_passphrase_strength_secure");
                    }

                    if (passwordNotice) {
                        $.growl("<strong>" + $.t("warning") + "</strong>: " + passwordNotice, {
                            "type": "danger"
                        });
                    }
                    krs.getAccountInfo(true, function() {
                        if (krs.accountInfo.currentLeasingHeightFrom) {
                            krs.isLeased = (krs.lastBlockHeight >= krs.accountInfo.currentLeasingHeightFrom && krs.lastBlockHeight <= krs.accountInfo.currentLeasingHeightTo);
                        } else {
                            krs.isLeased = false;
                        }
                        krs.updateForgingTooltip($.t("forging_unknown_tooltip"));
                        krs.updateForgingStatus(isPassphraseLogin ? id : null);
                        if (krs.isLocalHost && isPassphraseLogin) {
                            var forgingIndicator = $("#forging_indicator");
                            krs.sendRequest("startForging", {
                                "secretPhrase": id
                            }, function (response) {
                                if ("deadline" in response) {
                                    forgingIndicator.addClass("forging");
                                    forgingIndicator.find("span").html($.t("forging")).attr("data-i18n", "forging");
                                    krs.forgingStatus = krs.constants.FORGING;
                                    krs.updateForgingTooltip(krs.getForgingTooltip);
                                } else {
                                    forgingIndicator.removeClass("forging");
                                    forgingIndicator.find("span").html($.t("not_forging")).attr("data-i18n", "not_forging");
                                    krs.forgingStatus = krs.constants.NOT_FORGING;
                                    krs.updateForgingTooltip(response.errorDescription);
                                }
                                forgingIndicator.show();
                            });
                        }
                    }, isAccountSwitch);
                    krs.initSidebarMenu();
                    krs.unlock();

                    if (krs.isOutdated) {
                        $.growl($.t("krs_update_available"), {
                            "type": "danger"
                        });
                    }

                    if (!krs.downloadingBlockchain) {
                        krs.checkIfOnAFork();
                    }
                    krs.logConsole("User Agent: " + String(navigator.userAgent));
                    if (navigator.userAgent.indexOf('Safari') != -1 &&
                        navigator.userAgent.indexOf('Chrome') == -1 &&
                        navigator.userAgent.indexOf('JavaFX') == -1) {
                        // Don't use account based DB in Safari due to a buggy indexedDB implementation (2015-02-24)
                        krs.createDatabase("krs_USER_DB");
                        $.growl($.t("krs_safari_no_account_based_db"), {
                            "type": "danger"
                        });
                    } else {
                        krs.createDatabase("krs_USER_DB_" + String(krs.account));
                    }
                    if (callback) {
                        callback();
                    }

                    $.each(krs.pages, function(key) {
                        if(key in krs.setup) {
                            krs.setup[key]();
                        }
                    });

                    $(".sidebar .treeview").tree();
                    $('#dashboard_link').find('a').addClass("ignore").click();

                    var accounts;
                    if ($("#remember_account").is(":checked") || krs.newlyCreatedAccount) {
                        var accountExists = 0;
                        if (krs.getStrItem("savedKPLAccounts")) {
                            accounts = krs.getStrItem("savedKPLAccounts").split(";");
                            $.each(accounts, function(index, account) {
                                if (account == krs.accountRS) {
                                    accountExists = 1;
                                }
                            });
                        }
                        if (!accountExists){
                            if (krs.getStrItem("savedKPLAccounts") && krs.getStrItem("savedKPLAccounts") != ""){
                                accounts = krs.getStrItem("savedKPLAccounts") + krs.accountRS + ";";
                                krs.setStrItem("savedKPLAccounts", accounts);
                            } else {
                                krs.setStrItem("savedKPLAccounts", krs.accountRS + ";");
                            }
                        }
                    }

                    $("[data-i18n]").i18n();

                    /* Add accounts to dropdown for quick switching */
                    var accountIdDropdown = $("#account_id_dropdown");
                    accountIdDropdown.find(".dropdown-menu .switchAccount").remove();
                    if (krs.getStrItem("savedKPLAccounts") && krs.getStrItem("savedKPLAccounts")!=""){
                        accountIdDropdown.show();
                        accounts = krs.getStrItem("savedKPLAccounts").split(";");
                        $.each(accounts, function(index, account) {
                            if (account != ''){
                                $('#account_id_dropdown').find('.dropdown-menu')
                                    .append($("<li class='switchAccount'></li>")
                                        .append($("<a></a>")
                                            .attr("href","#")
                                            .attr("style","font-size: 85%;")
                                            .attr("onClick","krs.switchAccount('"+account+"')")
                                            .text(account))
                                    );
                            }
                        });
                    } else {
                        accountIdDropdown.hide();
                    }

                    krs.updateApprovalRequests();
                });
            });
        });
    };

    $("#logout_button_container").on("show.bs.dropdown", function() {
        if (krs.forgingStatus != krs.constants.FORGING) {
            $(this).find("[data-i18n='logout_stop_forging']").hide();
        }
    });

    krs.initPluginWarning = function() {
        if (krs.activePlugins) {
            var html = "";
            html += "<div style='font-size:13px;'>";
            html += "<div style='background-color:#e6e6e6;padding:12px;'>";
            html += "<span data-i18n='following_plugins_detected'>";
            html += "The following active plugins have been detected:</span>";
            html += "</div>";
            html += "<ul class='list-unstyled' style='padding:11px;border:1px solid #e0e0e0;margin-top:8px;'>";
            $.each(krs.plugins, function(pluginId, pluginDict) {
                if (pluginDict["launch_status"] == krs.constants.PL_PAUSED) {
                    html += "<li style='font-weight:bold;'>" + pluginDict["manifest"]["name"] + "</li>";
                }
            });
            html += "</ul>";
            html += "</div>";

            $('#lockscreen_active_plugins_overview').popover({
                "html": true,
                "content": html,
                "trigger": "hover"
            });

            html = "";
            html += "<div style='font-size:13px;padding:5px;'>";
            html += "<p data-i18n='plugin_security_notice_full_access'>";
            html += "Plugins are not sandboxed or restricted in any way and have full accesss to your client system including your KPL passphrase.";
            html += "</p>";
            html += "<p data-i18n='plugin_security_notice_trusted_sources'>";
            html += "Make sure to only run plugins downloaded from trusted sources, otherwise ";
            html += "you can loose your KPL! In doubt don't run plugins with accounts ";
            html += "used to store larger amounts of KPL now or in the future.";
            html += "</p>";
            html += "</div>";

            $('#lockscreen_active_plugins_security').popover({
                "html": true,
                "content": html,
                "trigger": "hover"
            });

            $("#lockscreen_active_plugins_warning").show();
        } else {
            $("#lockscreen_active_plugins_warning").hide();
        }
    };

    krs.showLockscreen = function() {
        krs.listAccounts();
        krs.showLoginScreen();
        /*
         if (localStorage.getItem("logged_in")) {
         krs.showLoginScreen();
         } else {
         krs.showWelcomeScreen();
         }
         */

        $("#center").show();
        if (!krs.isShowDummyCheckbox) {
            $("#dummyCheckbox").hide();
        }
    };

    krs.unlock = function() {
        if (!localStorage.getItem("logged_in")) {
            localStorage.setItem("logged_in", true);
        }
        $("#lockscreen").hide();
        $("body, html").removeClass("lockscreen");
        $("#login_error").html("").hide();
        $(document.documentElement).scrollTop = 0;
    };

    krs.logout = function(stopForging) {
        if (stopForging && krs.forgingStatus == krs.constants.FORGING) {
            var stopForgingModal = $("#stop_forging_modal");
            stopForgingModal.find(".show_logout").show();
            stopForgingModal.modal("show");
        } else {
            krs.setDecryptionPassword("");
            krs.setPassword("");
            //window.location.reload();
            window.location.href = window.location.pathname;
        }
    };

    $("#logout_clear_user_data_confirm_btn").click(function(e) {
        e.preventDefault();
        if (krs.database) {
            //noinspection JSUnresolvedFunction
            indexedDB.deleteDatabase(krs.database.name);
        }
        if (krs.legacyDatabase) {
            //noinspection JSUnresolvedFunction
            indexedDB.deleteDatabase(krs.legacyDatabase.name);
        }
        krs.removeItem("logged_in");
        krs.removeItem("savedKPLAccounts");
        krs.removeItem("language");
        krs.removeItem("themeChoice");
        krs.removeItem("remember_passphrase");
        krs.localStorageDrop("data");
        krs.localStorageDrop("polls");
        krs.localStorageDrop("contacts");
        krs.localStorageDrop("assets");
        krs.logout();
    });

    krs.setPassword = function(password) {
        krs.setEncryptionPassword(password);
        krs.setServerPassword(password);
    };
    return krs;
}(krs || {}, jQuery));