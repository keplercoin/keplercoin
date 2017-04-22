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
	krs.automaticallyCheckRecipient = function() {
        var $recipientFields = $("#send_money_recipient, #transfer_asset_recipient, #transfer_currency_recipient, " +
        "#send_message_recipient, #add_contact_account_id, #update_contact_account_id, #lease_balance_recipient, " +
        "#transfer_alias_recipient, #sell_alias_recipient, #set_account_property_recipient, #delete_account_property_recipient, " +
		"#add_monitored_account_recipient");

		$recipientFields.on("blur", function() {
			$(this).trigger("checkRecipient");
		});

		$recipientFields.on("checkRecipient", function() {
			var value = $(this).val();
			var modal = $(this).closest(".modal");

			if (value && value != "KPL-____-____-____-_____") {
				krs.checkRecipient(value, modal);
			} else {
				modal.find(".account_info").hide();
			}
		});

		$recipientFields.on("oldRecipientPaste", function() {
			var modal = $(this).closest(".modal");

			var callout = modal.find(".account_info").first();

			callout.removeClass("callout-info callout-danger callout-warning").addClass("callout-danger").html($.t("error_numeric_ids_not_allowed")).show();
		});
	};

	$("#send_message_modal, #send_money_modal, #transfer_currency_modal, #add_contact_modal, #set_account_property_modal, #delete_account_property_modal").on("show.bs.modal", function(e) {
		var $invoker = $(e.relatedTarget);
		var account = $invoker.data("account");
		if (!account) {
			account = $invoker.data("contact");
		}
		if (account) {
			var $inputField = $(this).find("input[name=recipient], input[name=account_id]").not("[type=hidden]");
			if (!/KPL\-/i.test(account)) {
				$inputField.addClass("noMask");
			}
			$inputField.val(account).trigger("checkRecipient");
		}
	});

	//todo later: http://twitter.github.io/typeahead.js/
	var modal = $(".modal");
    modal.on("click", "span.recipient_selector button, span.plain_address_selector button", function(e) {
		if (!Object.keys(krs.contacts).length) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		var $list = $(this).parent().find("ul");

		$list.empty();

		for (var accountId in krs.contacts) {
			if (!krs.contacts.hasOwnProperty(accountId)) {
				continue;
			}
			$list.append("<li><a href='#' data-contact-id='" + accountId + "' data-contact='" + String(krs.contacts[accountId].name).escapeHTML() + "'>" + String(krs.contacts[accountId].name).escapeHTML() + "</a></li>");
		}
	});

	modal.on("click", "span.recipient_selector ul li a", function(e) {
		e.preventDefault();
		$(this).closest("form").find("input[name=converted_account_id]").val("");
		$(this).closest("form").find("input[name=recipient],input[name=account_id]").not("[type=hidden]").trigger("unmask").val($(this).data("contact")).trigger("blur");
	});

	modal.on("click", "span.plain_address_selector ul li a", function(e) {
		e.preventDefault();
		$(this).closest(".input-group").find("input.plain_address_selector_input").not("[type=hidden]").trigger("unmask").val($(this).data("contact-id")).trigger("blur");
	});

	modal.on("keyup blur show", ".plain_address_selector_input", function() {
		var currentValue = $(this).val();
		var contactInfo;
		if (krs.contacts[currentValue]) {
			contactInfo = krs.contacts[currentValue]['name'];
		} else {
			contactInfo = " ";
		}
		$(this).closest(".input-group").find(".pas_contact_info").text(contactInfo);
	});

	krs.forms.sendMoneyComplete = function(response, data) {
		if (!(data["_extra"] && data["_extra"].convertedAccount) && !(data.recipient in krs.contacts)) {
			$.growl($.t("success_send_money") + " <a href='#' data-account='" + krs.getAccountFormatted(data, "recipient") + "' data-toggle='modal' data-target='#add_contact_modal' style='text-decoration:underline'>" + $.t("add_recipient_to_contacts_q") + "</a>", {
				"type": "success"
			});
		} else {
			$.growl($.t("send_money_submitted"), {
				"type": "success"
			});
		}
	};

	krs.sendMoneyShowAccountInformation = function(accountId) {
		krs.getAccountError(accountId, function(response) {
			if (response.type == "success") {
				$("#send_money_account_info").hide();
			} else {
				$("#send_money_account_info").html(response.message).show();

			}
		});
	};

	krs.getAccountError = function(accountId, callback) {
		krs.sendRequest("getAccount", {
			"account": accountId
		}, function(response) {
			if (response.publicKey) {
				if (response.name){
					callback({
						"type": "info",
						"message": $.t("recipient_info_with_name", {
							"name" : response.name,
							"kpl": krs.formatAmount(response.unconfirmedBalanceNQT, false, true)
						}),
						"account": response
					});
				}
				else{
					callback({
						"type": "info",
						"message": $.t("recipient_info", {
							"kpl": krs.formatAmount(response.unconfirmedBalanceNQT, false, true)
						}),
						"account": response
					});
				}
			} else {
				if (response.errorCode) {
					if (response.errorCode == 4) {
						callback({
							"type": "danger",
							"message": $.t("recipient_malformed") + (!/^(KPL\-)/i.test(accountId) ? " " + $.t("recipient_alias_suggestion") : ""),
							"account": null
						});
					} else if (response.errorCode == 5) {
						callback({
							"type": "warning",
							"message": $.t("recipient_unknown_pka"),
							"account": null,
							"noPublicKey": true
						});
					} else {
						callback({
							"type": "danger",
							"message": $.t("recipient_problem") + " " + String(response.errorDescription).escapeHTML(),
							"account": null
						});
					}
				} else {
					callback({
						"type": "warning",
						"message": $.t("recipient_no_public_key_pka", {
							"kpl": krs.formatAmount(response.unconfirmedBalanceNQT, false, true)
						}),
						"account": response,
						"noPublicKey": true
					});
				}
			}
		});
	};

	krs.correctAddressMistake = function(el) {
		$(el).closest(".modal-body").find("input[name=recipient],input[name=account_id]").val($(el).data("address")).trigger("blur");
	};

	krs.checkRecipient = function(account, modal) {
		var classes = "callout-info callout-danger callout-warning";

		var callout = modal.find(".account_info").first();
		var accountInputField = modal.find("input[name=converted_account_id]");
		var merchantInfoField = modal.find("input[name=merchant_info]");

		accountInputField.val("");
		merchantInfoField.val("");

		account = $.trim(account);

		//solomon reed. Btw, this regex can be shortened..
		if (/^(KPL\-)?[A-Z0-9]+\-[A-Z0-9]+\-[A-Z0-9]+\-[A-Z0-9]+/i.test(account)) {
			var address = new KplAddress();

			if (address.set(account)) {
				krs.getAccountError(account, function(response) {
					if (response.noPublicKey && account!=krs.accountRS) {
						modal.find(".recipient_public_key").show();
					} else {
						modal.find("input[name=recipientPublicKey]").val("");
						modal.find(".recipient_public_key").hide();
					}
					if (response.account && response.account.description) {
						checkForMerchant(response.account.description, modal);
					}
					
					if (account==krs.accountRS)
						callout.removeClass(classes).addClass("callout-" + response.type).html("This is your account").show();
					else{
						var message = response.message.escapeHTML();
						callout.removeClass(classes).addClass("callout-" + response.type).html(message).show();
					}
				});
			} else {
				if (address.guess.length == 1) {
					callout.removeClass(classes).addClass("callout-danger").html($.t("recipient_malformed_suggestion", {
						"recipient": "<span class='malformed_address' data-address='" + String(address.guess[0]).escapeHTML() + "' onclick='krs.correctAddressMistake(this);'>" + address.format_guess(address.guess[0], account) + "</span>"
					})).show();
				} else if (address.guess.length > 1) {
					var html = $.t("recipient_malformed_suggestion", {
						"count": address.guess.length
					}) + "<ul>";
					for (var i = 0; i < address.guess.length; i++) {
						html += "<li><span class='malformed_address' data-address='" + String(address.guess[i]).escapeHTML() + "' onclick='krs.correctAddressMistake(this);'>" + address.format_guess(address.guess[i], account) + "</span></li>";
					}

					callout.removeClass(classes).addClass("callout-danger").html(html).show();
				} else {
					callout.removeClass(classes).addClass("callout-danger").html($.t("recipient_malformed")).show();
				}
			}
		} else if (!(/^\d+$/.test(account))) {
			if (account.charAt(0) != '@') {
				krs.storageSelect("contacts", [{
					"name": account
				}], function(error, contact) {
					if (!error && contact.length) {
						contact = contact[0];
						krs.getAccountError(contact.accountRS, function(response) {
							if (response.noPublicKey && account!=krs.account) {
								modal.find(".recipient_public_key").show();
							} else {
								modal.find("input[name=recipientPublicKey]").val("");
								modal.find(".recipient_public_key").hide();
							}
							if (response.account && response.account.description) {
								checkForMerchant(response.account.description, modal);
							}

							callout.removeClass(classes).addClass("callout-" + response.type).html($.t("contact_account_link", {
								"account_id": krs.getAccountFormatted(contact, "account")
							}) + " " + response.message.escapeHTML()).show();

							if (response.type == "info" || response.type == "warning") {
								accountInputField.val(contact.accountRS);
							}
						});
					} else if (/^[a-z0-9]+$/i.test(account)) {
						krs.checkRecipientAlias(account, modal);
					} else {
						callout.removeClass(classes).addClass("callout-danger").html($.t("recipient_malformed")).show();
					}
				});
			} else if (/^[a-z0-9@]+$/i.test(account)) {
				if (account.charAt(0) == '@') {
					account = account.substring(1);
					krs.checkRecipientAlias(account, modal);
				}
			} else {
				callout.removeClass(classes).addClass("callout-danger").html($.t("recipient_malformed")).show();
			}
		} else {
			callout.removeClass(classes).addClass("callout-danger").html($.t("error_numeric_ids_not_allowed")).show();
		}
	};

	krs.checkRecipientAlias = function(account, modal) {
		var classes = "callout-info callout-danger callout-warning";
		var callout = modal.find(".account_info").first();
		var accountInputField = modal.find("input[name=converted_account_id]");

		accountInputField.val("");

		krs.sendRequest("getAlias", {
			"aliasName": account
		}, function(response) {
			if (response.errorCode) {
				callout.removeClass(classes).addClass("callout-danger").html($.t("error_invalid_account_id")).show();
			} else {
				if (response.aliasURI) {
					var alias = String(response.aliasURI);
					var timestamp = response.timestamp;

					var regex_1 = /acct:(.*)@KPL/;
					var regex_2 = /nacc:(.*)/;

					var match = alias.match(regex_1);

					if (!match) {
						match = alias.match(regex_2);
					}

					if (match && match[1]) {
						match[1] = String(match[1]).toUpperCase();

						if (/^\d+$/.test(match[1])) {
							var address = new KplAddress();

							if (address.set(match[1])) {
								match[1] = address.toString();
							} else {
								accountInputField.val("");
								callout.removeClass(classes).addClass("callout-danger").html($.t("error_invalid_account_id")).show();
								return;
							}
						}

						krs.getAccountError(match[1], function(response) {
							if (response.noPublicKey) {
								modal.find(".recipient_public_key").show();
							} else {
								modal.find("input[name=recipientPublicKey]").val("");
								modal.find(".recipient_public_key").hide();
							}
							if (response.account && response.account.description) {
								checkForMerchant(response.account.description, modal);
							}

							callout.removeClass(classes).addClass("callout-" + response.type).html($.t("alias_account_link", {
								"account_id": String(match[1]).escapeHTML()
							}) + " " + response.message.escapeHTML() + " " + $.t("alias_last_adjusted", {
								"timestamp": krs.formatTimestamp(timestamp)
							})).show();

							if (response.type == "info" || response.type == "warning") {
								accountInputField.val(String(match[1]).escapeHTML());
							}
						});
					} else {
						callout.removeClass(classes).addClass("callout-danger").html($.t("alias_account_no_link") + (!alias ? $.t("error_uri_empty") : $.t("uri_is", {
							"uri": String(alias).escapeHTML()
						}))).show();
					}
				} else if (response.aliasName) {
					callout.removeClass(classes).addClass("callout-danger").html($.t("error_alias_empty_uri")).show();
				} else {
					callout.removeClass(classes).addClass("callout-danger").html(response.errorDescription ? $.t("error") + ": " + String(response.errorDescription).escapeHTML() : $.t("error_alias")).show();
				}
			}
		});
	};

	function checkForMerchant(accountInfo, modal) {
		var requestType = modal.find("input[name=request_type]").val();

		if (requestType == "sendMoney" || requestType == "transferAsset") {
			if (accountInfo.match(/merchant/i)) {
				modal.find("input[name=merchant_info]").val(accountInfo);
				var checkbox = modal.find("input[name=add_message]");
				if (!checkbox.is(":checked")) {
					checkbox.prop("checked", true).trigger("change");
				}
			}
		}
	}

	return krs;
}(krs || {}, jQuery));