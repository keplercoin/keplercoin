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
    var tokenModal = $("#token_modal");
    tokenModal.on("show.bs.modal", function() {
		$("#generate_token_output, #decode_token_output").html("").hide();

		$("#token_modal_generate_token").show();
		$("#generate_token_button").show();
		$("#validate_token_button").hide();
	});
	
	krs.forms.decodeToken = function() {
		return {
			data: {
				"website": $("#decode_token_data").val(),
				"token": $("#decode_token_token").val()
			}
		};
	};
	
	krs.forms.decodeTokenComplete = function(response) {
		$("#token_modal").find(".error_message").hide();

		if (response.valid) {
			$("#decode_token_output").html($.t("success_valid_token", {
				"account_link": krs.getAccountLink(response, "account"),
				"timestamp": krs.formatTimestamp(response.timestamp)
			})).addClass("callout-info").removeClass("callout-danger").show();
		} else {
			$("#decode_token_output").html($.t("error_invalid_token", {
				"account_link": krs.getAccountLink(response, "account"),
				"timestamp": krs.formatTimestamp(response.timestamp)
			})).addClass("callout-danger").removeClass("callout-info").show();
		}
	};

	krs.forms.decodeTokenError = function() {
		$("#decode_token_output").hide();
	};

    tokenModal.find("ul.nav li").click(function(e) {
		e.preventDefault();
		var tab = $(this).data("tab");
		$(this).siblings().removeClass("active");
		$(this).addClass("active");
		$(".token_modal_content").hide();
		var content = $("#token_modal_" + tab);
		if (tab == "generate_token") {
			$("#generate_token_button").show();
			$("#validate_token_button").hide();
		} else {
            $("#generate_token_button").hide();
            $("#validate_token_button").show();
		}

		$("#token_modal").find(".error_message").hide();
		content.show();
	});

	tokenModal.on("hidden.bs.modal", function() {
		$(this).find(".token_modal_content").hide();
		$(this).find("ul.nav li.active").removeClass("active");
		$("#generate_token_nav").addClass("active");
	});

    $("#generate_token_button").click(function (e) {
        var data = $.trim($("#generate_token_data").val());
        var tokenOutput = $("#generate_token_output");
        if (!data || data == "") {
            tokenOutput.html($.t("data_required_field"));
            tokenOutput.addClass("callout-danger").removeClass("callout-info").show();
            return;
        }
        if (!krs.rememberPassword) {
			var secretPhrase = $.trim($("#generate_token_password").val());
			var publicKey = krs.getPublicKey(converters.stringToHexString(secretPhrase));
			if (publicKey != krs.publicKey) {
				tokenOutput.html($.t("error_incorrect_passphrase"));
				tokenOutput.addClass("callout-danger").removeClass("callout-info").show();
				return;
			}
		}
        var token = krs.generateToken(data, secretPhrase);
        tokenOutput.html($.t("generated_token_is") + "<br/><br/><textarea readonly style='width:100%' rows='3'>" + token + "</textarea>");
        tokenOutput.addClass("callout-info").removeClass("callout-danger").show();
        e.preventDefault();
    });

	return krs;
}(krs || {}, jQuery));